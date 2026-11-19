<?php

declare(strict_types=1);

/**
 * Modelo de um vinho do catálogo.
 * Só guarda os dados e sabe se transformar em array para virar JSON.
 */
final class Vinho implements JsonSerializable
{
    /** Tipos aceitos no catálogo (também usados para validar o filtro da API). */
    public const TIPOS = ['tinto', 'branco', 'rosé', 'espumante', 'sobremesa'];

    /**
     * @param string[] $harmonizacao
     */
    public function __construct(
        public readonly string $slug,
        public readonly string $nome,
        public readonly string $tipo,
        public readonly string $uva,
        public readonly int $safra,
        public readonly float $teorAlcoolico,
        public readonly int $volumeMl,
        public readonly float $preco,
        public readonly string $descricaoCurta,
        public readonly string $notasDegustacao,
        public readonly array $harmonizacao,
        public readonly string $temperaturaServico,
        public readonly string $corLiquido,
        public readonly string $corRotulo,
        public readonly bool $destaque,
    ) {
    }

    /** Cria um Vinho a partir de um item do JSON (chaves em snake_case). */
    public static function criarDeArray(array $dados): self
    {
        return new self(
            slug: $dados['slug'],
            nome: $dados['nome'],
            tipo: $dados['tipo'],
            uva: $dados['uva'],
            safra: (int) $dados['safra'],
            teorAlcoolico: (float) $dados['teor_alcoolico'],
            volumeMl: (int) $dados['volume_ml'],
            preco: (float) $dados['preco'],
            descricaoCurta: $dados['descricao_curta'],
            notasDegustacao: $dados['notas_degustacao'],
            harmonizacao: $dados['harmonizacao'],
            temperaturaServico: $dados['temperatura_servico'],
            corLiquido: $dados['cor_liquido'],
            corRotulo: $dados['cor_rotulo'],
            destaque: (bool) $dados['destaque'],
        );
    }

    /** Diz se um texto é um tipo de vinho válido. */
    public static function tipoValido(string $tipo): bool
    {
        return in_array($tipo, self::TIPOS, true);
    }

    /** Volta para o formato do JSON (snake_case), usado pelo json_encode. */
    public function jsonSerialize(): array
    {
        return [
            'slug' => $this->slug,
            'nome' => $this->nome,
            'tipo' => $this->tipo,
            'uva' => $this->uva,
            'safra' => $this->safra,
            'teor_alcoolico' => $this->teorAlcoolico,
            'volume_ml' => $this->volumeMl,
            'preco' => $this->preco,
            'descricao_curta' => $this->descricaoCurta,
            'notas_degustacao' => $this->notasDegustacao,
            'harmonizacao' => $this->harmonizacao,
            'temperatura_servico' => $this->temperaturaServico,
            'cor_liquido' => $this->corLiquido,
            'cor_rotulo' => $this->corRotulo,
            'destaque' => $this->destaque,
        ];
    }
}
