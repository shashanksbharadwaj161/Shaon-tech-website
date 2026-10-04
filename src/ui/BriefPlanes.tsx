import { FoldedMark } from '../brand/FoldedMark';

interface BriefPlanesProps {
  /** Current brief step (1–3), or 'preview' for the fully assembled lead-in. */
  step: 1 | 2 | 3 | 'preview';
}

const PLANES = [
  { key: 'project', label: 'Project & goals' },
  { key: 'budget', label: 'Budget & timing' },
  { key: 'review', label: 'Review & send' },
] as const;

/**
 * Three folded interface planes that assemble around the brief as it
 * progresses: a plane folds into place for each step reached. They sit
 * behind the form card (never over inputs, focus rings or errors) and are
 * purely decorative.
 */
export function BriefPlanes({ step }: BriefPlanesProps) {
  const reached = step === 'preview' ? 3 : step;
  return (
    <div className="bp" data-step={step} aria-hidden="true">
      {PLANES.map((p, i) => {
        const state = i + 1 < reached ? 'done' : i + 1 === reached ? (step === 'preview' ? 'done' : 'active') : 'pending';
        return (
          <div key={p.key} className={`bp__plane bp__plane--${i + 1}`} data-state={state}>
            <span className="bp__edge" />
            <span className="bp__label mono">
              0{i + 1} · {p.label}
            </span>
            <span className="bp__lines">
              <i />
              <i />
              <i />
            </span>
            {i === 2 && <FoldedMark className="bp__mark" />}
          </div>
        );
      })}
    </div>
  );
}
