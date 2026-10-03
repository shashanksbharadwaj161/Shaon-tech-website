import { FoldedMark } from '../brand/FoldedMark';

/** Shown for the moment a lazily loaded page chunk takes to arrive. */
export function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <FoldedMark className="page-loading__mark" />
      <span className="visually-hidden">Loading page</span>
    </div>
  );
}
