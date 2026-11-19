<?php

declare(strict_types=1);

/**
 * Ponto de entrada da API. Faz três coisas:
 * 1. carrega as classes de src/ automaticamente;
 * 2. libera o CORS para o front em desenvolvimento;
 * 3. olha a URL e chama o Catalogo certo, respondendo com RespostaJson.
 */

// Carrega "Vinho" de src/Vinho.php, e assim por diante (uma classe por arquivo).
spl_autoload_register(function (string $classe): void {
    $arquivo = __DIR__ . '/../src/' . $classe . '.php';
    if (is_file($arquivo)) {
        require $arquivo;
    }
});

// --- CORS: só os endereços do Live Server podem chamar a API ---
const ORIGENS_PERMITIDAS = ['http://localhost:5500', 'http://127.0.0.1:5500'];

$origem = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origem, ORIGENS_PERMITIDAS, true)) {
    header("Access-Control-Allow-Origin: $origem");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo === 'OPTIONS') {
    http_response_code(204); // resposta ao "preflight" do navegador
    return;
}

// --- Roteamento ---
$caminho = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$caminho = rtrim($caminho, '/');

$catalogo = new Catalogo(__DIR__ . '/../dados/vinhos.json');

try {
    if ($metodo !== 'GET') {
        RespostaJson::erro('Método não permitido. Use GET.', 405);
        return;
    }

    // GET /api/vinhos?tipo=...&busca=...
    if ($caminho === '/api/vinhos') {
        $tipo = isset($_GET['tipo']) ? (string) $_GET['tipo'] : null;
        $busca = isset($_GET['busca']) ? (string) $_GET['busca'] : null;
        RespostaJson::sucesso($catalogo->listar($tipo, $busca));
        return;
    }

    // GET /api/vinhos/{slug}
    if (preg_match('#^/api/vinhos/([a-z0-9-]+)$#', $caminho, $partes)) {
        $vinho = $catalogo->buscarPorSlug($partes[1]);
        if ($vinho === null) {
            RespostaJson::erro("Vinho \"{$partes[1]}\" não encontrado.", 404);
            return;
        }
        RespostaJson::sucesso($vinho);
        return;
    }

    RespostaJson::erro('Rota não encontrada.', 404);
} catch (InvalidArgumentException $erro) {
    // Filtro inválido vindo da URL: culpa de quem chamou → 400.
    RespostaJson::erro($erro->getMessage(), 400);
} catch (Throwable $erro) {
    // Qualquer outra falha é problema nosso → 500, sem expor detalhes.
    error_log($erro->getMessage());
    RespostaJson::erro('Erro interno no servidor.', 500);
}
