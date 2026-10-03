import { site } from '../content/site';
import { FoldedMark } from './FoldedMark';

interface LogoProps {
  className?: string;
  /** Show the wordmark next to the mark. */
  wordmark?: boolean;
}

/** Mark + "ShaOn Tech" wordmark. The text is real text so it is announced once. */
export function Logo({ className, wordmark = true }: LogoProps) {
  return (
    <span className={['logo', className].filter(Boolean).join(' ')}>
      <FoldedMark className="logo__mark" title={wordmark ? undefined : site.name} />
      {wordmark && (
        <span className="logo__word">
          <span className="logo__strong">{site.nameParts.strong}</span>{' '}
          <span className="logo__light">{site.nameParts.light}</span>
        </span>
      )}
    </span>
  );
}
