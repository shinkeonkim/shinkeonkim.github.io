import { AnimationPlayer, koreanStrings } from '@kokoa/clotho/react';
import type { AnimationDocument } from '@kokoa/clotho';

export default function PlayerWrapper({
  def,
}: {
  def: AnimationDocument;
}): React.JSX.Element {
  return (
    <div className="not-prose my-6">
      <AnimationPlayer doc={def} strings={koreanStrings} theme="auto" />
    </div>
  );
}
