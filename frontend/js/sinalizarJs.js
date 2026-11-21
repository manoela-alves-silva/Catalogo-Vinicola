// Marca o <html> com a classe "js" assim que a página começa a carregar.
// O CSS usa essa classe para mostrar o que só faz sentido com JavaScript
// (preloader, botão do menu no celular). Sem JS, nada disso aparece e o conteúdo fica visível.
// É um script clássico carregado no <head> (sem defer) para a classe existir antes da
// primeira pintura; se viesse no main.js, o conteúdo "piscaria" antes do preloader cobrir.
document.documentElement.classList.add('js');
