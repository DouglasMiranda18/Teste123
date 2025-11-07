// Substitua pelos dados do seu projeto Firebase
// Crie um projeto em console.firebase.google.com e copie a config Web
// Dica: Habilite o Firestore em modo de teste ou ajuste as regras

(function () {
  // Configuração real do Firebase (fornecida pelo cliente)
  const firebaseConfig = {
    apiKey: "AIzaSyAVcoPoCfXj6DcC1okiSvffZuJYcf6GI3U",
    authDomain: "flat-mar-doce-lar.firebaseapp.com",
    projectId: "flat-mar-doce-lar",
    storageBucket: "flat-mar-doce-lar.firebasestorage.app",
    messagingSenderId: "794048132017",
    appId: "1:794048132017:web:b5fd5037c024a4f78d8390",
    measurementId: "G-N0WDNRLX92"
  };

  try {
    // Evita inicializar mais de uma vez
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    // Opcional: evita erros com campos undefined
    if (db && db.settings) db.settings({ ignoreUndefinedProperties: true });
    // expõe globalmente para outros scripts
    window.db = db;
  } catch (e) {
    // Se a config não foi preenchida, ignoramos silenciosamente
    console.warn('Firebase não inicializado. Preencha firebaseConfig em firebase-init.js.');
  }
})();


