export default {
  init: function (config) {
    let menuOpen = false;
    const backgroundColor = '#15ecda';
    function toggleMenu() {
      menuOpen = !menuOpen;
      const iconChat = document.getElementById('icon-chat');
      const iconClose = document.getElementById('icon-close');
      const chatOverlay = document.getElementById('chat-overlay');
      if (menuOpen) {
        iconChat.style.display = 'none';
        iconClose.style.display = 'block';
        chatOverlay.style.display = 'flex';
      } else {
        iconChat.style.display = 'block';
        iconClose.style.display = 'none';
        chatOverlay.style.display = 'none';
      }
    }
    const helpButton = document.createElement('div');
    helpButton.id = 'help-button';
    helpButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 100%;
      display: flex;
      cursor: pointer;
      background: ${'#15ecda'};
    `;

    helpButton.addEventListener('click', toggleMenu);

    const iconChat = document.createElement('img');
    iconChat.id = 'icon-chat';
    iconChat.src = config.icon_chat;
    iconChat.alt = 'Help Icon';
    iconChat.style.cssText = `
      width: 40px;
      height: 40px;
      object-fit: contain;
      margin: auto;
    `;
    helpButton.appendChild(iconChat);

    const iconClose = document.createElement('img');
    iconClose.id = 'icon-close';
    iconClose.src = config.icon_close;
    iconClose.alt = 'Help Icon';
    iconClose.style.cssText = `
      display: none;
      width: 40px;
      height: 40px;
      object-fit: contain;
      margin: auto;
    `;
    helpButton.appendChild(iconClose);

    document.body.appendChild(helpButton);

    const chatOverlay = document.createElement('div');
    chatOverlay.id = 'chat-overlay';
    chatOverlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 70px;
      width: 350px;
      height: 500px;
      border: 1px solid #ccc;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      background: #fff;
      z-index: 10000;
      display: none;
      flex-direction: column;
      font-family: Arial, sans-serif;
    `;

    // Crear el encabezado del chat
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
      padding: 10px;
      background-color: ${backgroundColor};
      color: white;
      font-weight: bold;
      text-align: center;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      cursor: move;
    `;
    chatHeader.textContent = 'Chat';

    // Permitir mover el chat
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    chatHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - chatOverlay.getBoundingClientRect().left;
      offsetY = e.clientY - chatOverlay.getBoundingClientRect().top;
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        chatOverlay.style.left = `${e.clientX - offsetX}px`;
        chatOverlay.style.top = `${e.clientY - offsetY}px`;
        chatOverlay.style.bottom = 'auto';
        chatOverlay.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = 'auto';
    });

    // Crear el área de mensajes
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chat-messages';
    chatMessages.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background-color: #f9f9f9;
    `;

    // Crear el área de entrada de mensajes
    const chatInputContainer = document.createElement('div');
    chatInputContainer.style.cssText = `
      display: flex;
      padding: 10px;
      border-top: 1px solid #ddd;
    `;

    const chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.placeholder = 'Type a message...';
    chatInput.style.cssText = `
      flex: 1;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      outline: none;
      font-size: 16px;
    `;

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.cssText = `
      margin-left: 8px;
      padding: 8px 16px;
      background-color: ${backgroundColor};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    `;

    sendButton.addEventListener('mouseover', () => {
      sendButton.style.backgroundColor = `${backgroundColor}cc`;
    });

    sendButton.addEventListener('mouseout', () => {
      sendButton.style.backgroundColor = `${backgroundColor}80`;
    });

    sendButton.addEventListener('click', () => {
      const message = chatInput.value.trim();
      if (message) {
        appendMessage('You', message);
        chatInput.value = '';
        simulateReply();
      }
    });

    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });

    chatInputContainer.appendChild(chatInput);
    chatInputContainer.appendChild(sendButton);

    // Agregar elementos al contenedor del chat
    chatOverlay.appendChild(chatHeader);
    chatOverlay.appendChild(chatMessages);
    chatOverlay.appendChild(chatInputContainer);

    // Agregar el chat al cuerpo del documento
    document.body.appendChild(chatOverlay);

    // Utility function to format date
    function formatDateString(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Funciones auxiliares
    function appendMessage(sender, message, timestamp = new Date().toISOString()) {
      const messageContainer = document.createElement('div');
      messageContainer.style.cssText = `
        display: flex;
        gap: 14px;
        margin-bottom: 14px;
        align-items: flex-start;
        ${sender === 'You' ? 'flex-direction: row-reverse;' : ''}
      `;

      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background-color: ${sender === 'You' ? '#82c0cf' : '#54D969'};
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      `;
      const avatarImg = document.createElement('img');
      avatarImg.src = sender === 'You' ? config.logo : config.logo;
      avatarImg.alt = sender;
      avatarImg.style.cssText = `
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 50%;
      `;
      avatar.appendChild(avatarImg);

      const statusIndicator = document.createElement('div');
      statusIndicator.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: #54D969;
        border: 4px solid white;
        border-radius: 50%;
        position: absolute;
        bottom: -5px;
        ${sender === 'You' ? 'right: -5px;' : 'left: -5px;'}
      `;
      avatar.appendChild(statusIndicator);

      const messageContent = document.createElement('div');
      messageContent.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        ${sender === 'You' ? 'align-items: flex-end;' : 'align-items: flex-start;'}
      `;

      const messageBubble = document.createElement('p');
      messageBubble.textContent = message;
      messageBubble.style.cssText = `
        padding: 16px;
        border-radius: 16px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 18px;
        max-width: 70%;
        background-color: ${sender === 'You' ? '#15ECDA40' : '#F4F4F4'};
        color: ${sender === 'You' ? '#000' : '#333'};
      `;
      messageContent.appendChild(messageBubble);

      const messageTimestamp = document.createElement('p');
      messageTimestamp.textContent = formatDateString(timestamp);
      messageTimestamp.style.cssText = `
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #BFBFBF;
        padding: 0 16px;
        margin: 0;
      `;
      messageContent.appendChild(messageTimestamp);

      messageContainer.appendChild(avatar);
      messageContainer.appendChild(messageContent);
      chatMessages.appendChild(messageContainer);

      // Scroll to bottom of the chat
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function simulateReply() {
      setTimeout(() => {
        appendMessage('Bot', 'This is a bot reply!');
      }, 1000);
    }
  },
};
