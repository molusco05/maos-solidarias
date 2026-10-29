/* =========================================================
   MÃOS SOLIDÁRIAS — DADOS DO SITE
   Edite este arquivo para atualizar o conteúdo sem mexer
   no HTML. Veja README.md para instruções.
   ========================================================= */

const ONG_PADRAO = {
  nome: "Cáritas Campinas — Casa Antônio Fernando dos Santos",
  url: "https://caritascampinas.org.br/casa-antonio-fernando-dos-santos/"
};

/* ---------- PAINEL "AVISTEI ALGUÉM" ---------- */
const LOCAIS = {
  semaforo: { label: "Semáforo", icone: "🚦" },
  praca: { label: "Praça", icone: "🌳" },
  marquise: { label: "Marquise", icone: "🏬" },
  viaduto: { label: "Viaduto", icone: "🌉" },
  calcada: { label: "Calçada", icone: "🚶" },
  outro: { label: "Outro", icone: "📍" }
};

const NECESSIDADES = {
  comida: "🍲 Comida",
  agua: "💧 Água",
  cobertor: "🛌 Cobertor",
  roupas: "🧥 Roupas",
  sapatos: "👟 Sapatos",
  saude: "🩺 Saúde",
  higiene: "🧼 Higiene",
  documentos: "🪪 Documentos",
  abrigo: "🏠 Abrigo",
  pet: "🐶 Pet"
};

const FAIXAS_ETARIAS = {
  menor: "Menos de 18",
  jovem: "18 a 29",
  adulto: "30 a 59",
  idoso: "60 ou mais",
  nao_sei: "Não sei"
};

// Palavras que, digitadas na história/aparência, disparam alertas automáticos
const PALAVRAS_URGENCIA = ["ferid", "sangr", "desmai", "inconsciente", "convuls", "machucad", "fratur", "hipotermia", "tremendo", "overdose", "não responde", "nao responde", "caído", "caido"];
const PALAVRAS_MENOR = ["criança", "crianca", "menor", "bebê", "bebe", "adolescente", "menina", "menino"];

/* ---------- MURAL DA ESPERANÇA ----------
   foto: URL ou caminho (ex.: "assets/img/joao.jpg"). Vazio = avatar ilustrado.
   pix:  chave PIX da própria pessoa. Vazio = mostra botão para ONG.
   ong:  ONG que acompanha a pessoa (usada quando não há PIX).
   tipoLocal: chave de LOCAIS · horasAtras: quando foi visto (exemplos)
   exemplo: true exibe o selo "Perfil de exemplo".
   IMPORTANTE: só publique perfis reais com autorização por escrito
   da pessoa retratada. */
const MURAL = [
  {
    nome: "Seu Antônio",
    idade: 58,
    cidade: "Campinas",
    tipoLocal: "semaforo",
    local: "Semáforo da Av. Norte-Sul com Av. Orosimbo Maia",
    horasAtras: 2,
    urgencia: "media",
    historia: "Ex-pedreiro, perdeu o emprego e a casa na pandemia. Sonha em voltar a trabalhar com obras e reencontrar a filha.",
    pix: "",
    ong: ONG_PADRAO,
    precisa: ["cobertor", "sapatos"],
    exemplo: true
  },
  {
    nome: "Dona Cida",
    idade: 63,
    cidade: "São Paulo",
    tipoLocal: "praca",
    local: "Praça da Sé, perto da catedral",
    horasAtras: 5,
    urgencia: "alta",
    historia: "Vende balas no centro há 6 anos. Adora plantas e cuida de uma horta comunitária com outras moradoras.",
    pix: "exemplo.dona.cida@pix.com",
    ong: null,
    precisa: ["saude", "comida"],
    exemplo: true
  },
  {
    nome: "Rafael",
    idade: 27,
    cidade: "Belo Horizonte",
    tipoLocal: "calcada",
    local: "Calçada da Praça Sete",
    horasAtras: 20,
    urgencia: "baixa",
    historia: "Músico de rua, toca violão na praça. Está juntando para tirar documentos e alugar um quartinho.",
    pix: "exemplo-rafael-pix-0001",
    ong: null,
    precisa: ["documentos", "roupas"],
    exemplo: true
  },
  {
    nome: "Marta e Pipoca",
    idade: 41,
    cidade: "Campinas",
    tipoLocal: "marquise",
    local: "Marquise na Rua 13 de Maio, centro",
    horasAtras: 9,
    urgencia: "media",
    historia: "Vive com sua cachorrinha Pipoca. Não aceita ir a abrigos que não recebem animais — por isso precisa de barraca.",
    pix: "",
    ong: ONG_PADRAO,
    precisa: ["abrigo", "pet"],
    exemplo: true
  },
  {
    nome: "Josué",
    idade: 35,
    cidade: "Rio de Janeiro",
    tipoLocal: "viaduto",
    local: "Embaixo do viaduto da Perimetral",
    horasAtras: 30,
    urgencia: "baixa",
    historia: "Catador de recicláveis, conhece cada rua do bairro. Quer comprar uma carroça nova para aumentar a renda.",
    pix: "exemplo.josue@pix.com",
    ong: null,
    precisa: ["sapatos", "agua"],
    exemplo: true
  },
  {
    nome: "Lúcia",
    idade: 49,
    cidade: "São Paulo",
    tipoLocal: "semaforo",
    local: "Semáforo da Av. Paulista com Rua Augusta",
    horasAtras: 48,
    urgencia: "baixa",
    historia: "Cozinheira de mão cheia. Está em acolhimento e procura uma vaga de emprego em restaurante.",
    pix: "",
    ong: {
      nome: "SP Invisível",
      url: "https://www.spinvisivel.org"
    },
    precisa: ["roupas", "higiene"],
    exemplo: true
  }
];

/* ---------- CARROSSEL DE DOAÇÕES ---------- */
const ITENS_DOACAO = [
  {
    icone: "🧥",
    titulo: "Roupas",
    cor: "magenta",
    resumo: "Agasalhos, calças e camisetas limpas fazem a diferença no frio.",
    dicas: ["Lavadas e em bom estado", "Prefira tamanhos M, G e GG", "Meias e roupas íntimas novas"],
    meta: 72
  },
  {
    icone: "👟",
    titulo: "Sapatos",
    cor: "laranja",
    resumo: "Quem anda o dia todo precisa de calçados firmes e confortáveis.",
    dicas: ["Tênis e botinas resistentes", "Numerações 38 a 44", "Chinelos também ajudam"],
    meta: 45
  },
  {
    icone: "🛌",
    titulo: "Cobertas",
    cor: "roxo",
    resumo: "Uma coberta pode salvar uma vida nas madrugadas de inverno.",
    dicas: ["Cobertores e edredons", "Mantas térmicas", "Sacos de dormir"],
    meta: 88
  },
  {
    icone: "🛏️",
    titulo: "Camas e colchões",
    cor: "azul",
    resumo: "Abrigos e repúblicas precisam de camas para acolher mais gente.",
    dicas: ["Colchões sem manchas", "Beliches desmontáveis", "Travesseiros novos"],
    meta: 30
  },
  {
    icone: "⛺",
    titulo: "Barracas",
    cor: "turquesa",
    resumo: "Proteção contra chuva e vento para quem ainda está na rua.",
    dicas: ["Barracas de 2 a 4 pessoas", "Lonas impermeáveis", "Isolantes térmicos"],
    meta: 22
  },
  {
    icone: "🧼",
    titulo: "Kits de higiene",
    cor: "amarelo",
    resumo: "Higiene é dignidade, saúde e autoestima.",
    dicas: ["Sabonete, escova e pasta", "Absorventes", "Desodorante e lâminas"],
    meta: 64
  },
  {
    icone: "🥫",
    titulo: "Alimentos",
    cor: "laranja",
    resumo: "Alimentos não perecíveis abastecem cozinhas solidárias.",
    dicas: ["Arroz, feijão, macarrão", "Leite em pó e café", "Marmitas: combine com a ONG"],
    meta: 55
  },
  {
    icone: "🐶",
    titulo: "Ração para pets",
    cor: "magenta",
    resumo: "Muitos não abandonam seus companheiros de quatro patas.",
    dicas: ["Ração seca para cães e gatos", "Coleiras e potes", "Antipulgas"],
    meta: 40
  }
];

/* ---------- ONGS E INICIATIVAS ---------- */
const ONGS = [
  {
    nome: "Cáritas Campinas",
    sub: "Casa Antônio Fernando dos Santos",
    descricao: "Acolhimento, alimentação e reinserção social de pessoas em situação de rua em Campinas (SP).",
    url: "https://caritascampinas.org.br/casa-antonio-fernando-dos-santos/",
    cor: "magenta"
  },
  {
    nome: "Pastoral do Povo da Rua",
    sub: "Arquidiocese de São Paulo",
    descricao: "Trabalho do padre Júlio Lancellotti: café da manhã para centenas de pessoas, apoio jurídico, psicológico e social.",
    url: "https://www.arquisp.org.br",
    cor: "laranja"
  },
  {
    nome: "Cáritas Brasileira",
    sub: "Rede nacional",
    descricao: "Organização com presença em todo o país, atuando em direitos humanos, emergências e inclusão social.",
    url: "https://caritas.org.br",
    cor: "roxo"
  },
  {
    nome: "Missão Vida",
    sub: "Reverendo Wildo dos Anjos",
    descricao: "Casas de recuperação que acolhem pessoas que viviam nas ruas. Inspirou o documentário “O Louco dos Mendigos”.",
    url: "https://missaovida.org.br",
    cor: "turquesa"
  },
  {
    nome: "SP Invisível",
    sub: "Histórias que transformam",
    descricao: "Dá voz e rosto às pessoas em situação de rua e promove ações de doação e empregabilidade.",
    url: "https://www.spinvisivel.org",
    cor: "azul"
  },
  {
    nome: "OBPopRua / UFMG",
    sub: "Dados e pesquisa",
    descricao: "Observatório que monitora a população em situação de rua no Brasil com dados públicos e atualizados.",
    url: "https://obpoprua.direito.ufmg.br",
    cor: "amarelo"
  }
];

/* ---------- DOCUMENTÁRIOS E LEITURAS ---------- */
const DOCUMENTARIOS = [
  {
    titulo: "À Margem da Imagem",
    info: "Evaldo Mocarzel · 2003",
    descricao: "Clássico que questiona como a população de rua de São Paulo é filmada e retratada — com a palavra dos próprios moradores.",
    url: "https://www.youtube.com/results?search_query=%C3%80+Margem+da+Imagem+document%C3%A1rio",
    cor: "magenta"
  },
  {
    titulo: "Estamira",
    info: "Marcos Prado · 2004",
    descricao: "Retrato intenso de uma mulher que viveu e trabalhou no aterro de Jardim Gramacho, no Rio de Janeiro.",
    url: "https://pt.wikipedia.org/wiki/Estamira",
    cor: "roxo"
  },
  {
    titulo: "O Louco dos Mendigos",
    info: "Viraliza Filmes",
    descricao: "Acompanha o reverendo Wildo dos Anjos e a Missão Vida. Premiado em festivais nos EUA, Austrália e Argentina.",
    url: "https://curtamais.com.br/goiania/documentario-louco-dos-mendigos/",
    cor: "laranja"
  },
  {
    titulo: "Olho da Rua",
    info: "Curta-metragem · 2021",
    descricao: "Alerta para a fome nas ruas e convoca apoio às ações do padre Júlio Lancellotti.",
    url: "https://www.brasildefato.com.br/2021/06/27/curta-olho-da-rua-alerta-para-fome-e-convoca-apoio-a-acoes-de-julio-lancellotti/",
    cor: "turquesa"
  },
  {
    titulo: "Onde eu moro",
    info: "Documentário · análise acadêmica",
    descricao: "Diálogos entre o filme e a Terapia Ocupacional Social sobre a diversidade de quem vive nas ruas.",
    url: "https://revistas.ufrj.br/index.php/ribto/article/view/65377",
    cor: "azul"
  },
  {
    titulo: "Doações em queda",
    info: "Reportagem · Agência Pública, 2026",
    descricao: "Como a saída do padre Júlio das redes afetou a arrecadação da Pastoral de Rua — e por que cada doação conta.",
    url: "https://apublica.org/2026/01/padre-julio-fora-das-redes-doacoes-para-projetos-caem-e-fieis-querem-ajuda-do-vaticano/",
    cor: "amarelo"
  }
];

/* ---------- GALERIA EM MOVIMENTO ---------- */
const UNSPLASH = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const GALERIA = [
  { src: UNSPLASH("1469571486292-0ba58a3f068b"), alt: "Mãos pintadas formando um coração vermelho" },
  { src: UNSPLASH("1593113598332-cd288d649433"), alt: "Voluntários organizando caixas de doação de alimentos" },
  { src: UNSPLASH("1518398046578-8cca57782e17"), alt: "Homem com cartaz pedindo gentileza humana" },
  { src: UNSPLASH("1617450365226-9bf28c04e130"), alt: "Grupo de voluntários reunidos" },
  { src: UNSPLASH("1532629345422-7515f3d16bb6"), alt: "Mãos segurando moedas com bilhete de mudança" },
  { src: UNSPLASH("1559027615-cd4628902d4a"), alt: "Voluntário de costas com camiseta escrita volunteer" },
  { src: UNSPLASH("1560243563-062bfc001d68"), alt: "Prateleira com calças jeans" },
  { src: UNSPLASH("1488521787991-ed7bbaae773c"), alt: "Crianças sorrindo para a câmera" }
];
