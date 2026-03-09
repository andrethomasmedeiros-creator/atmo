# 🔥 Guia de Configuração do Firebase

Siga este passo a passo para configurar o Firebase e colocar o sistema PTM para funcionar em tempo real.

## 📋 Pré-requisitos

- Conta Google (Gmail)
- Navegador atualizado

---

## 1️⃣ Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"** (ou "Create a project")
3. Nome do projeto: `ptm-sala-vermelha-hrvj`
4. **Desabilite** Google Analytics (não é necessário)
5. Clique em **"Criar projeto"**
6. Aguarde a criação e clique em **"Continuar"**

---

## 2️⃣ Configurar Firestore Database

1. No menu lateral esquerdo, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de teste"** (permite leitura/escrita sem autenticação)
4. Escolha a região: **`southamerica-east1 (São Paulo)`**
5. Clique em **"Ativar"**

---

## 3️⃣ Registrar o App Web

1. Na página inicial do projeto, clique no ícone **"</>"** (Web)
2. Nome do app: `PTM Sala Vermelha`
3. **NÃO** marque "Firebase Hosting" (configuraremos depois)
4. Clique em **"Registrar app"**
5. Você verá um código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ptm-sala-vermelha-hrvj.firebaseapp.com",
  projectId: "ptm-sala-vermelha-hrvj",
  storageBucket: "ptm-sala-vermelha-hrvj.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};
```

6. **COPIE** este objeto `firebaseConfig`
7. Clique em **"Continuar no console"**

---

## 4️⃣ Configurar o Projeto

1. Abra o arquivo `public/js/firebase-config.js`
2. Encontre esta parte no início do arquivo:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  ...
};
```

3. **Substitua** pelos valores que você copiou do Firebase
4. Salve o arquivo

---

## 5️⃣ Testar Localmente

### Opção A: Abrir direto no navegador
Simplesmente abra os arquivos HTML no navegador:
- `public/index.html` - Tablet Sala Vermelha
- `public/nac.html` - Dashboard NAC
- `public/centro-cirurgico.html` - Dashboard Centro Cirúrgico

### Opção B: Servidor local (recomendado)
```bash
# Com Python
cd public
python -m http.server 8000

# Acesse: http://localhost:8000
```

---

## 6️⃣ Deploy (Publicar Online)

### Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### Fazer login
```bash
firebase login
```

### Inicializar projeto
```bash
firebase init
```
- Selecione **Firestore** e **Hosting**
- Use as configurações existentes

### Publicar
```bash
firebase deploy
```

Após o deploy, você receberá uma URL como:
`https://ptm-sala-vermelha-hrvj.web.app`

---

## 🔧 Testando a Sincronização

1. Abra `index.html` em uma aba (Sala Vermelha)
2. Abra `nac.html` em outra aba (NAC)
3. Abra `centro-cirurgico.html` em uma terceira aba (C.C.)

4. Na Sala Vermelha:
   - Clique em "Novo Paciente"
   - Preencha os dados
   - Clique em "Iniciar Protocolo"
   - Selecione 2+ critérios
   - Confirme

5. **Automaticamente**, o caso deve aparecer na tela do NAC!

6. Continue o fluxo e veja as outras telas atualizarem em tempo real.

---

## ⚠️ Notas Importantes

### Sobre o Modo de Teste
O Firestore está configurado em "modo de teste", o que significa que qualquer pessoa pode ler/escrever dados. Isso é adequado para testes, mas em produção você deve:
1. Configurar autenticação
2. Atualizar as regras de segurança em `firestore.rules`

### URLs do Sistema
Após o deploy, use URLs separadas para cada tela:
- `https://seu-projeto.web.app/index.html` → Tablets na Sala Vermelha
- `https://seu-projeto.web.app/nac.html` → TV do NAC
- `https://seu-projeto.web.app/centro-cirurgico.html` → TV do Centro Cirúrgico

### Funciona Offline?
Os arquivos funcionam offline para visualização, mas para sincronização em tempo real é necessária conexão com internet.

---

## 📞 Suporte

Se tiver dúvidas, consulte:
- [Documentação Firebase](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)

---

**Hospital Regional Vale do Jaguaribe**  
Governo do Estado do Ceará
