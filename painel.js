// ====== Configuração Firebase ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Substitua pelos seus dados do Firebase:
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ========= SEGURANÇA =========
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else carregarPainel();
});
window.logout = () => signOut(auth).then(() => window.location.href = "login.html");

// ====== DADOS PERSONALIZÁVEIS SALVOS NO FIRESTORE ======
const confRef = doc(db, "config", "personalizacao");

// ------ Personalização: Banner, Logo, Cores, BannerText ------
async function salvarPersonalizacao(campo, valor) {
  await setDoc(confRef, { [campo]: valor }, { merge: true });
}
async function carregarPersonalizacao() {
  const snap = await getDoc(confRef);
  return snap.exists() ? snap.data() : {};
}

// Banner Upload
window.uploadBanner = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const refBanner = ref(storage, `painel/banner.jpg`);
  await uploadBytes(refBanner, file);
  const url = await getDownloadURL(refBanner);
  await salvarPersonalizacao("banner", url);
  document.getElementById('banner-atual').src = url;
}
window.editarBannerTexto = async () => {
  const txt = document.getElementById("banner-texto").value;
  await salvarPersonalizacao("bannerTexto", txt);
  document.getElementById("banner-txt-preview").innerText = txt;
}

// Logo Upload
window.uploadLogo = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const refLogo = ref(storage, `painel/logo.png`);
  await uploadBytes(refLogo, file);
  const url = await getDownloadURL(refLogo);
  await salvarPersonalizacao("logo", url);
  document.getElementById('logo-atual').src = url;
}

// Cores
window.mudarCor = async e => {
  await salvarPersonalizacao("corPrimaria", document.getElementById("cor-primaria").value);
  await salvarPersonalizacao("corSecundaria", document.getElementById("cor-secundaria").value);
  aplicarCores();
}
function aplicarCores() {
  carregarPersonalizacao().then(config => {
    document.documentElement.style.setProperty("--cor-primaria", config.corPrimaria || "#5632d6");
    document.documentElement.style.setProperty("--cor-secundaria", config.corSecundaria || "#ffd600");
  });
}

// ====== CATEGORIAS ======
async function salvarCategorias(categorias) {
  await salvarPersonalizacao("categorias", categorias);
}
async function carregarCategorias() {
  const config = await carregarPersonalizacao();
  return config.categorias || ["Óculos", "Relógio", "Fone", "Carteira", "Bolsas", "Calçados", "Roupas", "Lanternas", "Informática", "Outros"];
}

// Adicionar/remover categoria
window.adicionarCategoria = async () => {
  const cat = document.getElementById("nova-categoria").value.trim();
  if (!cat) return;
  let cats = await carregarCategorias();
  if (!cats.includes(cat)) {
    cats.push(cat);
    await salvarCategorias(cats);
    listarCategorias();
    document.getElementById("nova-categoria").value = "";
  }
}
window.removerCategoria = async idx => {
  let cats = await carregarCategorias();
  cats.splice(idx, 1);
  await salvarCategorias(cats);
  listarCategorias();
}
async function listarCategorias() {
  const cats = await carregarCategorias();
  const ul = document.getElementById("lista-categorias");
  ul.innerHTML = "";
  cats.forEach((cat, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${cat} <button class="btn-del-cat" onclick="removerCategoria(${i})">&times;</button>`;
    ul.appendChild(li);
  });
  // Atualizar select dos produtos
  const sel = document.getElementById("produto-categoria");
  sel.innerHTML = `<option disabled selected>Selecione</option>`;
  cats.forEach(cat => {
    sel.innerHTML += `<option>${cat}</option>`;
  });
}

// ====== PRODUTOS CRUD ======
const produtosRef = collection(db, "produtos");
window.editarProduto = async id => {
  const docu = await getDoc(doc(produtosRef, id));
  if (docu.exists()) {
    const p = docu.data();
    document.getElementById('produto-id').value = id;
    document.getElementById('produto-nome').value = p.nome;
    document.getElementById('produto-categoria').value = p.categoria;
    document.getElementById('produto-preco').value = p.preco;
    document.getElementById('produto-img').value = p.imagem;
    document.getElementById('produto-desc').value = p.descricao;
    document.getElementById('produto-destaque').checked = p.destaque;
    document.getElementById('produto-promocao').checked = p.promocao;
    window.scrollTo(0, 0);
  }
}
window.excluirProduto = async id => {
  if (confirm("Excluir este produto?")) {
    await deleteDoc(doc(produtosRef, id));
    listarProdutos();
  }
}
document.getElementById('form-produto').onsubmit = async e => {
  e.preventDefault();
  const prod = {
    nome: document.getElementById('produto-nome').value,
    categoria: document.getElementById('produto-categoria').value,
    preco: document.getElementById('produto-preco').value,
    imagem: document.getElementById('produto-img').value,
    descricao: document.getElementById('produto-desc').value,
    destaque: document.getElementById('produto-destaque').checked,
    promocao: document.getElementById('produto-promocao').checked
  };
  const id = document.getElementById('produto-id').value;
  if (id) {
    await updateDoc(doc(produtosRef, id), prod);
  } else {
    await addDoc(produtosRef, prod);
  }
  document.getElementById('form-produto').reset();
  listarProdutos();
}
window.cancelarEdicao = () => {
  document.getElementById('form-produto').reset();
  document.getElementById('produto-id').value = '';
}
async function listarProdutos() {
  const snap = await getDocs(produtosRef);
  const lista = document.getElementById('lista-produtos');
  lista.innerHTML = "";
  snap.forEach(docu => {
    const p = docu.data();
    lista.innerHTML += `
      <div class="produto-admin">
        <img src="${p.imagem}" alt="${p.nome}">
        <div class="produto-admin-info">
          <b>${p.nome}</b> <br>
          <span>${p.categoria}</span> <br>
          <span style="color: #16a34a; font-weight: bold">R$ ${p.preco}</span>
          <br>
          ${p.destaque ? "<span style='color: #ffd600;'>★ Destaque</span>" : ""}
          ${p.promocao ? "<span style='color: #7c3aed;'> Promoção</span>" : ""}
          <div style="color:#666; font-size:13px">${p.descricao || ""}</div>
        </div>
        <button class="btn-editar" onclick="editarProduto('${docu.id}')">Editar</button>
        <button class="btn-excluir" onclick="excluirProduto('${docu.id}')">Excluir</button>
      </div>
    `;
  });
}

// ========== CARREGAR PAINEL ==========
async function carregarPainel() {
  // Personalização
  const config = await carregarPersonalizacao();
  aplicarCores();
  // Logo e Banner
  document.getElementById('logo-atual').src = config.logo || "";
  document.getElementById('banner-atual').src = config.banner || "";
  document.getElementById('banner-txt-preview').innerText = config.bannerTexto || "Promoção de Lançamento! Aproveite ofertas especiais na Rolli!";
  document.getElementById('banner-texto').value = config.bannerTexto || "";
  document.getElementById('cor-primaria').value = config.corPrimaria || "#5632d6";
  document.getElementById('cor-secundaria').value = config.corSecundaria || "#ffd600";
  // Categorias
  listarCategorias();
  // Produtos
  listarProdutos();
}

// Mudança instantânea de cores ao mexer nos inputs
document.getElementById("cor-primaria").addEventListener("input", aplicarCores);
document.getElementById("cor-secundaria").addEventListener("input", aplicarCores);
