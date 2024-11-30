(async () => {
  const sofiaChat = await import('http://localhost:3001/files/sofia-chat.js');
  const config = {
    title: 'Sofia Chat',
    description: 'Bienvenido a nuestro chat con IA',
    logo: 'http://localhost:3000/demo/default-user-avatar.png',
    radius: 10,
    fontFamily: 'Arial, sans-serif',
    theme: 'Light',
  };
  sofiaChat.default.init(config);
})();
