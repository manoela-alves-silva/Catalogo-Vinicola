<?php

declare(strict_types=1);

/**
 * Catálogo de vinhos: carrega os dados, filtra por tipo, busca por texto
 * e encontra um vinho pelo slug.
 *
 * Toda a leitura da fonte de dados fica em carregarDados(). Para trocar o
 * JSON por um banco no futuro, basta reescrever esse método.
 */
final class Catalogo
{
    /** @var Vinho[]|null Cache dos vinhos já carregados. */
    private ?array $vinhos = null;

    public function __construct(private readonly string $caminhoArquivo)
    {
    }

    /**
     * Lista os vinhos, com filtros opcionais.
     *
     * @return Vinho[]
     * @throws InvalidArgumentException se o tipo não existir.
     */
    public function listar(?string $tipo = null, ?string $busca = null): array
    {
        $vinhos = $this->todos();

        if ($tipo !== null && trim($tipo) !== '') {
            $tipoOficial = $this->tipoOficial($tipo);
            if ($tipoOficial === null) {
                throw new InvalidArgumentException(
                    "Tipo inválido: \"$tipo\". Use um destes: " . implode(', ', Vinho::TIPOS) . '.'
                );
            }
            $vinhos = array_filter($vinhos, fn (Vinho $vinho) => $vinho->tipo === $tipoOficial);
        }

        if ($busca !== null && trim($busca) !== '') {
            $termo = $this->normalizar($busca);
            $vinhos = array_filter($vinhos, fn (Vinho $vinho) => $this->contemTermo($vinho, $termo));
        }

        // array_values reorganiza os índices para o JSON sair como lista [].
        return array_values($vinhos);
    }

    /** Encontra um vinho pelo slug, ou devolve null se não existir. */
    public function buscarPorSlug(string $slug): ?Vinho
    {
        foreach ($this->todos() as $vinho) {
            if ($vinho->slug === $slug) {
                return $vinho;
            }
        }
        return null;
    }

    /** @return Vinho[] */
    private function todos(): array
    {
        return $this->vinhos ??= $this->carregarDados();
    }

    /**
     * Único ponto que conhece a fonte de dados (hoje, o arquivo JSON).
     *
     * @return Vinho[]
     */
    private function carregarDados(): array
    {
        $conteudo = file_get_contents($this->caminhoArquivo);
        if ($conteudo === false) {
            throw new RuntimeException('Não foi possível ler o arquivo de vinhos.');
        }

        $itens = json_decode($conteudo, true, flags: JSON_THROW_ON_ERROR);

        return array_map(fn (array $item) => Vinho::criarDeArray($item), $itens);
    }

    /**
     * Converte o que veio na URL ("ROSE", "rosé", "Rose") para o tipo como
     * está nos dados ("rosé"). Devolve null se não for um tipo conhecido.
     */
    private function tipoOficial(string $tipo): ?string
    {
        $procurado = $this->normalizar($tipo);
        foreach (Vinho::TIPOS as $tipoValido) {
            if ($this->normalizar($tipoValido) === $procurado) {
                return $tipoValido;
            }
        }
        return null;
    }

    /** A busca olha nome, uva e descrição curta. */
    private function contemTermo(Vinho $vinho, string $termo): bool
    {
        $texto = $this->normalizar("$vinho->nome $vinho->uva $vinho->descricaoCurta");
        return str_contains($texto, $termo);
    }

    /** Minúsculas e sem acento, para "rose" achar "Rosé". */
    private function normalizar(string $texto): string
    {
        return strtr(mb_strtolower(trim($texto)), [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'ê' => 'e', 'è' => 'e', 'ë' => 'e',
            'í' => 'i', 'î' => 'i', 'ì' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ò' => 'o', 'ö' => 'o',
            'ú' => 'u', 'û' => 'u', 'ù' => 'u', 'ü' => 'u',
            'ç' => 'c',
        ]);
    }
}
