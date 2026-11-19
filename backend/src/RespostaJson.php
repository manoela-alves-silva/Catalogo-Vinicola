<?php

declare(strict_types=1);

/**
 * Padroniza as respostas da API: sempre JSON em UTF-8, com o código HTTP certo.
 * Erros saem no formato { "erro": "mensagem" }.
 */
final class RespostaJson
{
    public static function sucesso(mixed $dados, int $status = 200): void
    {
        self::enviar($dados, $status);
    }

    public static function erro(string $mensagem, int $status): void
    {
        self::enviar(['erro' => $mensagem], $status);
    }

    private static function enviar(mixed $corpo, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(
            $corpo,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION
        );
    }
}
