// Links do roadmap.sh de uma trilha (o conteúdo de estudo fica lá, ADR 001).
import type { Roadmap } from '../tipos';

export function Roadmaps({ roadmaps }: { roadmaps: Roadmap[] }) {
  return (
    <p className="roadmaps">
      Estudo no roadmap.sh:{' '}
      {roadmaps.map((r, i) => (
        <span key={r.url}>
          {i > 0 && ' · '}
          <a href={r.url}>{r.nome}</a>
        </span>
      ))}
    </p>
  );
}
