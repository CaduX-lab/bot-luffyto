const { 
Client, GatewayIntentBits, EmbedBuilder,
ActionRowBuilder, ButtonBuilder, ButtonStyle,
PermissionsBitField, StringSelectMenuBuilder,
ModalBuilder, TextInputBuilder, TextInputStyle,
ChannelType
} = require('discord.js');

const { QuickDB } = require("quick.db");
const db = new QuickDB();

const mongoose = require('mongoose');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

// ================= CONFIG =================
const PREFIX = "-";
const TOKEN = process.env.TOKEN || "";
const MONGO_URL = process.env.MONGO_URL || "";

const ADMINS = ["1479965799614775572"];
const STAFF_ROLE = "1496085967096778814";

const VIP_BASIC = "1495730133011660880";
const VIP_PRO = "1495730342999359550";
const VIP_PREMIUM = "1495730446938669056";

const ROLE_2X = "1495730502060085349";
const ROLE_4X = "1495730570636820530";

const DAILY = 12 * 60 * 60 * 1000;

const LOGS_CHANNEL = "1506057910671642824";

// ================= PREÇOS =================
const PRECOS = {
vb: 250,
vp: 450,
vpp: 750,
"2x": 200,
"4x": 400,
cor: 300
};

// ================= NOMES DOS PRODUTOS =================
const NOMES_PRODUTOS = {
vb: "Vip Básico",
vp: "Vip Pro",
vpp: "Vip Premium",
"2x": "2x XP Boost",
"4x": "4x XP Boost",
cor: "Cor Personalizada"
};

// ================= CORES PREDEFINIDAS =================
const CORES_PREDEFINIDAS = [
{ label: "Vermelho", value: "cor_vermelho", description: "Cor vermelho", emoji: "🔴", hex: "#FF0000" },
{ label: "Amarelo", value: "cor_amarelo", description: "Cor amarelo", emoji: "🟡", hex: "#FFD700" },
{ label: "Laranja", value: "cor_laranja", description: "Cor laranja", emoji: "🟠", hex: "#FF8C00" },
{ label: "Verde", value: "cor_verde", description: "Cor verde", emoji: "🟢", hex: "#00C853" },
{ label: "Azul", value: "cor_azul", description: "Cor azul", emoji: "🔵", hex: "#1565C0" },
{ label: "Roxo", value: "cor_roxo", description: "Cor roxo", emoji: "🟣", hex: "#7B1FA2" },
{ label: "Rosa", value: "cor_rosa", description: "Cor rosa", emoji: "🌸", hex: "#E91E8C" },
{ label: "Preto", value: "cor_preto", description: "Cor preto", emoji: "⚫", hex: "#23272A" },
{ label: "Branco", value: "cor_branco", description: "Cor branco", emoji: "⚪", hex: "#FFFFFF" },
{ label: "Cor Personalizada", value: "cor_custom", description: "Defina uma cor personalizada", emoji: "🎨" }
];

// ================= MONGODB SCHEMA =================
const presenteSchema = new mongoose.Schema({
codigo: { type: String, unique: true },
produto: String,
remetente: String,
destinatario: String,
resgatado: { type: Boolean, default: false },
criadoEm: { type: Date, default: Date.now }
});
const Presente = mongoose.models.Presente || mongoose.model('Presente', presenteSchema);

// ================= HELPERS =================
const getGold = async (id) => await db.get(`gold_${id}`) || 0;

function gerarCodigo() {
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let code = '';
for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
return code;
}

async function enviarLog(guild, mensagem, embed) {
try {
const canal = await guild.channels.fetch(LOGS_CHANNEL).catch(() => null);
if (!canal) return;
if (embed) return canal.send({ embeds: [embed] });
return canal.send({ content: mensagem });
} catch (e) {}
}

// ================= DAILY =================
function reward() {
const r = Math.random();
if (r < 0.50) return { gold: Math.floor(Math.random()*5)+1, raridade:"🟢 Comum" };
if (r < 0.85) return { gold: Math.floor(Math.random()*5)+6, raridade:"🔵 Raro" };
if (r < 0.98) return { gold: Math.floor(Math.random()*20)+11, raridade:"🟣 Épico" };
return { gold: Math.floor(Math.random()*20)+31, raridade:"🟡 Lendário" };
}

// ================= PREFIX =================
client.on("messageCreate", async (msg) => {
if (!msg.content.startsWith(PREFIX) || msg.author.bot) return;

const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
const cmd = args.shift().toLowerCase();

// SALDO PREFIX
if (cmd === "saldo") {
const user = msg.mentions.users.first() || msg.author;
const saldo = await getGold(user.id);

const embed = new EmbedBuilder()
.setColor("#ffd500")
.setAuthor({
name:`Saldo de ${user.username}`,
iconURL:user.displayAvatarURL({dynamic:true})
})
.setDescription(`💰 ${user} possui **${saldo} ST Golds**`)

return msg.reply({embeds:[embed]});
}

// ADD GOLD
if (cmd === "addgold") {
if (!ADMINS.includes(msg.author.id)) return msg.reply("❌ Sem permissão");

const user = msg.mentions.users.first();
const valor = parseInt(args[1]);

if (!user || isNaN(valor)) return msg.reply("Uso: -addgold @user quantidade");

await db.add(`gold_${user.id}`, valor);
return msg.reply(`✅ ${valor} ST Gold adicionados`);
}

// PIX (ALTERADO)
if (cmd === "pix") {
const user = msg.mentions.users.first();
const valor = parseInt(args[1]);

if (valor <= 0)
return msg.reply("❌ Valor inválido");

if (!user || isNaN(valor))
return msg.reply("Uso: -pix @user quantidade");

if (user.bot)
return msg.reply("❌|Você não pode enviar Golds para bot");

let gold = await getGold(msg.author.id);
if (gold < valor) return msg.reply("❌ Sem saldo");

await db.sub(`gold_${msg.author.id}`, valor);
await db.add(`gold_${user.id}`, valor);

const embed = new EmbedBuilder()
.setColor("#2ecc71")
.setTitle("💸 Transferência Realizada!")
.setDescription(`${msg.author} enviou **${valor} ST Golds** para ${user}!`);

// LOG de transferência
const logEmbed = new EmbedBuilder()
.setColor("#2ecc71")
.setTitle("💸 Transferência registrada")
.addFields(
{ name: "De", value: `${msg.author.tag} (${msg.author.id})`, inline: true },
{ name: "Para", value: `${user.tag} (${user.id})`, inline: true },
{ name: "Valor", value: `${valor} ST Golds`, inline: false }
)
.setTimestamp();
await enviarLog(msg.guild, null, logEmbed);

return msg.reply({embeds:[embed]});
}

});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async (i) => {

if (!i.inGuild()) return;

// ================= SLASH =================
if (i.isChatInputCommand()) {

// SALDO SLASH
if (i.commandName === "saldo") {
const user = i.options.getUser("usuario") || i.user;
const saldo = await getGold(user.id);

const embed = new EmbedBuilder()
.setColor("#ffd500")
.setAuthor({
name:`Saldo de ${user.username}`,
iconURL:user.displayAvatarURL({dynamic:true})
})
.setDescription(`💰 ${user} possui **${saldo} ST Golds**`)

return i.reply({embeds:[embed]});
}

// addgold
if (i.commandName === "addgold") {
if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
return i.reply({content:"Apenas staffs",ephemeral:true});

const user = i.options.getUser("usuario");
const valor = i.options.getInteger("quantidade");

await db.add(`gold_${user.id}`, valor);
return i.reply({content:`✅|${valor} ST Gold adicionados`,ephemeral:true});
}

// PIX SLASH (ALTERADO)
if (i.commandName === "pix") {
const user = i.options.getUser("usuario");
const valor = i.options.getInteger("valor");

if (valor <= 0)
return i.reply({
content:"❌ Valor inválido",
ephemeral:true
});

if (user.bot)
return i.reply({
content:"❌|Você não pode enviar ST Golds para bots",
ephemeral:true
});

let gold = await getGold(i.user.id);
if (gold < valor)
return i.reply({content:"❌|Gold insuficiente",ephemeral:true});

await db.sub(`gold_${i.user.id}`, valor);
await db.add(`gold_${user.id}`, valor);

const embed = new EmbedBuilder()
.setColor("#2ecc71")
.setTitle("💸 Transferência Realizada!")
.setDescription(`${i.user} enviou **${valor} ST Golds** para ${user}!`);

// LOG de transferência
const logEmbed = new EmbedBuilder()
.setColor("#2ecc71")
.setTitle("💸 Transferência registrada")
.addFields(
{ name: "De", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "Para", value: `${user.tag} (${user.id})`, inline: true },
{ name: "Valor", value: `${valor} ST Golds`, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

return i.reply({embeds:[embed]});
}

// coinflip
if (i.commandName === "coinflip") {
const escolha = i.options.getString("escolha");
const valor = i.options.getInteger("aposta");

let gold = await getGold(i.user.id);

if (valor <= 0)
return i.reply({
content:"❌ Valor inválido",
ephemeral:true
});

if (gold < valor)
return i.reply("❌ Sem saldo");

const resultado = Math.random() < 0.5 ? "cara" : "coroa";

let ganhou = resultado === escolha;

if (ganhou) {
await db.add(`gold_${i.user.id}`, valor);
} else {
await db.sub(`gold_${i.user.id}`, valor);
}

const saldoAtual = await getGold(i.user.id);

const embed = new EmbedBuilder()
.setColor(ganhou ? "#57F287" : "#ED4245")
.setTitle("🪙 Coinflip");

if (ganhou) {
embed.setDescription(
`🎉 Você ganhou **${valor} ST Golds**.`
);
} else {
embed.setDescription(
`💸 Você perdeu **${valor} ST Golds**.`
);
}

embed.addFields(
{
name:"💸 Aposta",
value:`${valor} ST Golds`,
inline:false
},
{
name:"Sua Escolha",
value: escolha.charAt(0).toUpperCase() + escolha.slice(1),
inline:true
},
{
name:"Resultado",
value: resultado.charAt(0).toUpperCase() + resultado.slice(1),
inline:true
},
{
name:"💰 Saldo Atual",
value:`${saldoAtual} ST Golds`,
inline:false
}
);

embed.setFooter({
text:`Aposta de ${i.user.username}`,
iconURL:i.user.displayAvatarURL({dynamic:true})
});

return i.reply({embeds:[embed]});
}

// dadobet
if (i.commandName === "dadobet") {
const numero = i.options.getInteger("numero");
const valor = i.options.getInteger("aposta");

let gold = await getGold(i.user.id);

if (valor <= 0)
return i.reply({
content:"❌ Valor inválido",
ephemeral:true
});

if (gold < valor)
return i.reply("❌ Sem saldo");

const dado = Math.floor(Math.random()*6)+1;

const ganhou = numero === dado;

if (ganhou) {
await db.add(`gold_${i.user.id}`, valor * 2);
} else {
await db.sub(`gold_${i.user.id}`, valor);
}

const saldoAtual = await getGold(i.user.id);

const embed = new EmbedBuilder()
.setColor(ganhou ? "#57F287" : "#ED4245")
.setTitle("🎲 DadoBet");

if (ganhou) {
embed.setDescription(
`🎉 O resultado foi **${dado}** e você acertou!\nVocê ganhou **${valor * 2} ST Golds**.`
);
} else {
embed.setDescription(
`😢 O resultado foi **${dado}**, mas você escolheu **${numero}**.\nVocê perdeu **${valor} ST Golds**.`
);
}

embed.addFields(
{
name:"💸 Sua Aposta",
value:`${valor} ST Golds`,
inline:false
},
{
name:"🎯 Número Escolhido",
value:`${numero}`,
inline:true
},
{
name:"🎲 Resultado",
value:`${dado}`,
inline:true
},
{
name:"💰 Saldo Atual",
value:`${saldoAtual} ST Golds`,
inline:false
}
);

embed.setFooter({
text:`Aposta realizada por ${i.user.username}`,
iconURL:i.user.displayAvatarURL({dynamic:true})
});

return i.reply({embeds:[embed]});
}

// DAILY
if (i.commandName === "daily") {
if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
return i.reply({content:"Apenas staffs",ephemeral:true});

const embed = new EmbedBuilder()
.setColor("#ff0000")
.setImage("https://cdn.discordapp.com/attachments/1480219873215905943/1501371848456405143/ChatGPT_Image_5_de_mai._de_2026_19_55_34.png");

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("daily_resgatar").setLabel("Resgatar").setEmoji("🎁").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("daily_chances").setLabel("Chances").setEmoji("📊").setStyle(ButtonStyle.Secondary)
);

return i.reply({embeds:[embed],components:[row]});
}

// LOJA
if (i.commandName === "loja") {
const embed = new EmbedBuilder()
.setColor("#111111")
.setAuthor({
name: "🛒 Loja Oficial ST Comunity"
})
.setDescription(
"Selecione um produto abaixo para ver detalhes e comprar!\n\nTodos os valores em ST Golds"
)
.setThumbnail("https://cdn-icons-png.flaticon.com/512/263/263142.png");

const menu = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("menu_loja")
.setPlaceholder("Escolha um item da loja")
.addOptions([
{label:"🛍️ Vip Básico",value:"vb",description:"Acesso a benefícios básicos exclusivos"},
{label:"🛍️ Vip Pro",value:"vp",description:"Mais vantagens e melhorias no servidor"},
{label:"🛍️ Vip Premium",value:"vpp",description:"Máximo nível de benefícios e status"},
{label:"🛍️ 2x XP Boost",value:"2x",description:"Ganhe o dobro de XP por 24 horas"},
{label:"🛍️ 4x XP Boost",value:"4x",description:"Ganhe 4x mais XP por 24 horas"},
{label:"🎨 Cor Personalizada",value:"cor",description:"Personalize a cor do seu nick"}
])
);

return i.reply({embeds:[embed],components:[menu],ephemeral:true});
}

// RESGATAR PRESENTE
if (i.commandName === "resgatar") {
const codigo = i.options.getString("codigo").toUpperCase().trim();

const presente = await Presente.findOne({ codigo });

if (!presente) {
return i.reply({ content: "❌ Código inválido ou não encontrado.", ephemeral: true });
}

if (presente.resgatado) {
return i.reply({ content: "❌ Este presente já foi resgatado.", ephemeral: true });
}

presente.resgatado = true;
presente.destinatario = i.user.id;
await presente.save();

const produto = presente.produto;

// Entregar produto
if (produto === "vb") await i.member.roles.add(VIP_BASIC).catch(() => {});
if (produto === "vp") await i.member.roles.add(VIP_PRO).catch(() => {});
if (produto === "vpp") await i.member.roles.add(VIP_PREMIUM).catch(() => {});
if (produto === "2x") {
await i.member.roles.add(ROLE_2X).catch(() => {});
setTimeout(async () => {
await i.member.roles.remove(ROLE_2X).catch(() => {});
}, 86400000);
}
if (produto === "4x") {
await i.member.roles.add(ROLE_4X).catch(() => {});
setTimeout(async () => {
await i.member.roles.remove(ROLE_4X).catch(() => {});
}, 86400000);
}
if (produto === "cor") {
await db.set(`presente_cor_${i.user.id}`, true);
}

const embedResgate = new EmbedBuilder()
.setColor("#57F287")
.setTitle("🎁 Presente Resgatado!")
.setDescription(`Você resgatou **${NOMES_PRODUTOS[produto] || produto}** com sucesso!`)
.addFields(
{ name: "🎟️ Código", value: `\`${codigo}\``, inline: true },
{ name: "📦 Produto", value: NOMES_PRODUTOS[produto] || produto, inline: true }
)
.setTimestamp();

// LOG de resgate
const logEmbed = new EmbedBuilder()
.setColor("#57F287")
.setTitle("🎁 Presente Resgatado")
.addFields(
{ name: "Resgatado por", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "Enviado por", value: `<@${presente.remetente}>`, inline: true },
{ name: "Produto", value: NOMES_PRODUTOS[produto] || produto, inline: false },
{ name: "Código", value: `\`${codigo}\``, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

return i.reply({ embeds: [embedResgate], ephemeral: true });
}

} // FECHA O isChatInputCommand()

// ================= SELECT =================
if (i.isStringSelectMenu()) {

if (i.customId === "menu_loja") {
const escolha = i.values[0];

// Verificação anti desperdício
let jaTemMsg = null;
if (escolha === "vb" && i.member.roles.cache.has(VIP_BASIC)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "vp" && i.member.roles.cache.has(VIP_PRO)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "vpp" && i.member.roles.cache.has(VIP_PREMIUM)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "2x" && i.member.roles.cache.has(ROLE_2X)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "4x" && i.member.roles.cache.has(ROLE_4X)) jaTemMsg = "❌ Você já possui este produto";
const jaPossui = await db.get(`cor_cargo_${i.user.id}`);
if (escolha === "cor" && jaPossui) jaTemMsg = "❌ Você já possui este produto";

if (jaTemMsg) {
return i.reply({ content: jaTemMsg, ephemeral: true });
}

// Se for cor, mostrar menu de cores
if (escolha === "cor") {
const embedCor = new EmbedBuilder()
.setColor("#111111")
.setTitle("🎨 Escolha sua Cor")
.setDescription("Personalize a cor do seu nick na ST Comunity.")
.addFields({ name: "💰 Preço", value: `**${PRECOS.cor} ST Golds**` });

const menuCores = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("menu_cores")
.setPlaceholder("Selecione uma cor...")
.addOptions(CORES_PREDEFINIDAS)
);

return i.reply({ embeds: [embedCor], components: [menuCores], ephemeral: true });
}

// Produtos normais - tela de confirmação igual às prints
const nomeProduto = NOMES_PRODUTOS[escolha] || escolha;

const embedConfirm = new EmbedBuilder()
.setColor("#111111")
.setTitle(`🔒 ${nomeProduto}`)
.setDescription(
escolha === "vb" ? "Desbloqueie o Vip Básico com benefícios exclusivos!" :
escolha === "vp" ? "Desbloqueie o Vip Pro com mais vantagens!" :
escolha === "vpp" ? "Desbloqueie o Vip Premium, o máximo nível!" :
escolha === "2x" ? "Ganhe o dobro de XP por 24 horas!" :
escolha === "4x" ? "Ganhe 4x mais XP por 24 horas!" :
"Produto exclusivo da loja ST Comunity."
)
.addFields(
{ name: "💰 Preço", value: `**${PRECOS[escolha]} ST Golds**` }
);

const botoesConfirm = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(`comprar_${escolha}`)
.setLabel("✅ Confirmar Compra")
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId(`presente_${escolha}`)
.setLabel("🎁 Enviar como Presente")
.setStyle(ButtonStyle.Primary),
new ButtonBuilder()
.setCustomId("cancelar")
.setLabel("❌ Cancelar")
.setStyle(ButtonStyle.Danger)
);

return i.reply({ embeds: [embedConfirm], components: [botoesConfirm], ephemeral: true });
}

// Menu de cores
if (i.customId === "menu_cores") {
const corEscolhida = i.values[0];

if (corEscolhida === "cor_custom") {
// Abrir modal para HEX personalizado
const modal = new ModalBuilder()
.setCustomId("modal_cor_custom")
.setTitle("🎨 Cor Personalizada");

const hexInput = new TextInputBuilder()
.setCustomId("hex_input")
.setLabel("Digite o código HEX da cor (ex: #FF5733)")
.setStyle(TextInputStyle.Short)
.setPlaceholder("#FF5733")
.setRequired(true)
.setMinLength(4)
.setMaxLength(7);

const row = new ActionRowBuilder().addComponents(hexInput);
modal.addComponents(row);

return i.showModal(modal);
}

// Cor predefinida selecionada
const corInfo = CORES_PREDEFINIDAS.find(c => c.value === corEscolhida);
if (!corInfo) return i.reply({ content: "❌ Cor não encontrada.", ephemeral: true });

// Verificar saldo
const gold = await getGold(i.user.id);
if (gold < PRECOS.cor) {
return i.reply({ content: "❌ Saldo insuficiente para comprar Cor Personalizada.", ephemeral: true });
}

// Descontar gold
await db.sub(`gold_${i.user.id}`, PRECOS.cor);

// Remover cargo de cor antigo
const cargoAntigoId = await db.get(`cor_cargo_${i.user.id}`);
if (cargoAntigoId) {
const cargoAntigo = i.guild.roles.cache.get(cargoAntigoId);
if (cargoAntigo) {
await i.member.roles.remove(cargoAntigo).catch(() => {});
await cargoAntigo.delete("Cor antiga removida").catch(() => {});
}
await db.delete(`cor_cargo_${i.user.id}`);
}

// Criar novo cargo com a cor
const nomeNick = i.member.nickname || i.user.username;
const nomeCargo = `cor-${corInfo.label.toLowerCase()}-${nomeNick.replace(/\s+/g, '')}`;

const novoCargo = await i.guild.roles.create({
name: nomeCargo,
color: corInfo.hex,
reason: `Cor comprada por ${i.user.tag}`
});

await i.member.roles.add(novoCargo);
await db.set(`cor_cargo_${i.user.id}`, novoCargo.id);

// LOG
const logEmbed = new EmbedBuilder()
.setColor(corInfo.hex)
.setTitle("🎨 Cor Criada")
.addFields(
{ name: "Usuário", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "Cor", value: corInfo.label, inline: true },
{ name: "HEX", value: corInfo.hex, inline: true },
{ name: "Cargo criado", value: nomeCargo, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

const embedSucesso = new EmbedBuilder()
.setColor(corInfo.hex)
.setTitle("🎨 Cor Aplicada!")
.setDescription(`Sua cor **${corInfo.label}** foi criada e aplicada com sucesso!\n\nCargo: **${nomeCargo}**`);

return i.reply({ embeds: [embedSucesso], ephemeral: true });
}

}

// ================= MODAIS =================
if (i.isModalSubmit()) {

if (i.customId === "modal_cor_custom") {
let hex = i.fields.getTextInputValue("hex_input").trim();
if (!hex.startsWith("#")) hex = "#" + hex;

const hexValido = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
if (!hexValido) {
return i.reply({ content: "❌ Código HEX inválido. Exemplo: `#FF5733`", ephemeral: true });
}

// Verificar saldo
const gold = await getGold(i.user.id);
if (gold < PRECOS.cor) {
return i.reply({ content: "❌ Saldo insuficiente para comprar Cor Personalizada.", ephemeral: true });
}

// Descontar gold
await db.sub(`gold_${i.user.id}`, PRECOS.cor);

// Remover cargo de cor antigo
const cargoAntigoId = await db.get(`cor_cargo_${i.user.id}`);
if (cargoAntigoId) {
const cargoAntigo = i.guild.roles.cache.get(cargoAntigoId);
if (cargoAntigo) {
await i.member.roles.remove(cargoAntigo).catch(() => {});
await cargoAntigo.delete("Cor antiga removida").catch(() => {});
}
await db.delete(`cor_cargo_${i.user.id}`);
}

// Criar cargo
const nomeCor = hex.replace("#", "");
const nomeNick = i.member.nickname || i.user.username;
const nomeCargo = `cor-${nomeCor}-${nomeNick.replace(/\s+/g, '')}`;

const novoCargo = await i.guild.roles.create({
name: nomeCargo,
color: hex,
reason: `Cor personalizada comprada por ${i.user.tag}`
});

await i.member.roles.add(novoCargo);
await db.set(`cor_cargo_${i.user.id}`, novoCargo.id);

// LOG
const logEmbed = new EmbedBuilder()
.setColor(hex)
.setTitle("🎨 Cor Personalizada Criada")
.addFields(
{ name: "Usuário", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "HEX", value: hex, inline: true },
{ name: "Cargo criado", value: nomeCargo, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

const embedSucesso = new EmbedBuilder()
.setColor(hex)
.setTitle("🎨 Cor Personalizada Aplicada!")
.setDescription(`Sua cor **${hex}** foi criada e aplicada com sucesso!\n\nCargo: **${nomeCargo}**`);

return i.reply({ embeds: [embedSucesso], ephemeral: true });
}

}

// ================= BOTÕES =================
if (i.isButton()) {

if (i.customId === "daily_chances") {
return i.reply({
content:
"🟢 50% → 1 a 5 (Comum)\n🔵 35% → 6 a 10 (Raro)\n🟣 13% → 11 a 30 (Épico)\n🟡 2% → 31 a 50 (Lendário)",
ephemeral:true
});
}

if (i.customId === "daily_resgatar") {
const last = await db.get(`daily_${i.user.id}`) || 0;

if (Date.now() - last < DAILY) {
const tempo = DAILY - (Date.now() - last);
const h = Math.floor(tempo / 3600000);
const m = Math.floor((tempo % 3600000) / 60000);

return i.reply({
content:`❌ Você já resgatou seu daily\nVolte em ${h}h ${m}m`,
ephemeral:true
});
}

const r = reward();

await db.add(`gold_${i.user.id}`, r.gold);
await db.set(`daily_${i.user.id}`, Date.now());

return i.reply({
content:`💰 Você ganhou ${r.gold} ST Golds!\n${r.raridade}`,
ephemeral:true
});
}

if (i.customId.startsWith("comprar_")) {
const escolha = i.customId.replace("comprar_","");
let gold = await getGold(i.user.id);

// Verificação anti desperdício
let jaTemMsg = null;
if (escolha === "vb" && i.member.roles.cache.has(VIP_BASIC)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "vp" && i.member.roles.cache.has(VIP_PRO)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "vpp" && i.member.roles.cache.has(VIP_PREMIUM)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "2x" && i.member.roles.cache.has(ROLE_2X)) jaTemMsg = "❌ Você já possui este produto";
if (escolha === "4x" && i.member.roles.cache.has(ROLE_4X)) jaTemMsg = "❌ Você já possui este produto";

if (jaTemMsg) {
return i.update({ content: jaTemMsg, components: [], embeds: [] });
}

if (gold < PRECOS[escolha]) {
return i.update({
content:"❌ Saldo insuficiente",
components:[],
embeds:[]
});
}

await db.sub(`gold_${i.user.id}`, PRECOS[escolha]);

if (escolha === "vb") await i.member.roles.add(VIP_BASIC);
if (escolha === "vp") await i.member.roles.add(VIP_PRO);
if (escolha === "vpp") await i.member.roles.add(VIP_PREMIUM);

if (escolha === "2x") {
await i.member.roles.add(ROLE_2X);
setTimeout(async () => {
await i.member.roles.remove(ROLE_2X);
}, 86400000);
}

if (escolha === "4x") {
await i.member.roles.add(ROLE_4X);
setTimeout(async () => {
await i.member.roles.remove(ROLE_4X);
}, 86400000);
}

// LOG de compra
const logEmbed = new EmbedBuilder()
.setColor("#f1c40f")
.setTitle("🛒 Compra Realizada")
.addFields(
{ name: "Usuário", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "Produto", value: NOMES_PRODUTOS[escolha] || escolha, inline: true },
{ name: "Valor pago", value: `${PRECOS[escolha]} ST Golds`, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

return i.update({
content:"✅ Compra realizada",
components:[],
embeds:[]
});
}

// BOTÃO ENVIAR COMO PRESENTE
if (i.customId.startsWith("presente_")) {
const escolha = i.customId.replace("presente_", "");
let gold = await getGold(i.user.id);

if (gold < PRECOS[escolha]) {
return i.update({
content: "❌ Saldo insuficiente para enviar como presente",
components: [],
embeds: []
});
}

await db.sub(`gold_${i.user.id}`, PRECOS[escolha]);

// Gerar código único
let codigo = gerarCodigo();
let tentativas = 0;
while (await Presente.findOne({ codigo }) && tentativas < 10) {
codigo = gerarCodigo();
tentativas++;
}

// Salvar presente no MongoDB
const novoPresente = new Presente({
codigo,
produto: escolha,
remetente: i.user.id,
resgatado: false
});
await novoPresente.save();

// Enviar código para o usuário via DM
try {
const dmEmbed = new EmbedBuilder()
.setColor("#e91e8c")
.setTitle("🎁 Presente Gerado!")
.setDescription(`Você enviou um presente: **${NOMES_PRODUTOS[escolha] || escolha}**\n\nCompartilhe o código abaixo com quem quiser!`)
.addFields(
{ name: "🎟️ Código do Presente", value: `\`\`\`${codigo}\`\`\`` },
{ name: "📌 Como resgatar", value: "Use `/resgatar` e informe o código acima." }
)
.setTimestamp();

await i.user.send({ embeds: [dmEmbed] });
} catch (e) {}

// LOG de presente
const logEmbed = new EmbedBuilder()
.setColor("#e91e8c")
.setTitle("🎁 Presente Gerado")
.addFields(
{ name: "Remetente", value: `${i.user.tag} (${i.user.id})`, inline: true },
{ name: "Produto", value: NOMES_PRODUTOS[escolha] || escolha, inline: true },
{ name: "Valor pago", value: `${PRECOS[escolha]} ST Golds`, inline: false },
{ name: "Código", value: `\`${codigo}\``, inline: false }
)
.setTimestamp();
await enviarLog(i.guild, null, logEmbed);

return i.update({
content: `🎁 Presente gerado! O código foi enviado para sua DM.\n\n> Código: \`${codigo}\``,
components: [],
embeds: []
});
}

if (i.customId === "cancelar") {
return i.update({
content:"❌ Compra cancelada",
components:[],
embeds:[]
});
}

}

});

client.once("ready", () => {
console.log("🔥 BOT ONLINE");

// Conectar ao MongoDB
if (MONGO_URL) {
mongoose.connect(MONGO_URL)
.then(() => console.log("✅ MongoDB conectado"))
.catch(e => console.error("❌ Erro ao conectar MongoDB:", e));
} else {
console.warn("⚠️ MONGO_URL não definido. Sistema de presentes desativado.");
}
});

client.login(TOKEN);
