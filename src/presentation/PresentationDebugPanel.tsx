import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Model } from '../model';
import type { ViewerHandle } from '../Viewer';

type Props = {
  model: Model;
  progress: number;
  viewer: RefObject<ViewerHandle | null>;
  onSeek: (progress: number) => void;
};

type Toggles = { showBounds: boolean; showDirections: boolean; showIds: boolean; showTarget: boolean; annotations: boolean };

export default function PresentationDebugPanel({ model, progress, viewer, onSeek }: Props) {
  const [explosion, setExplosion] = useState(0);
  const [toggles, setToggles] = useState<Toggles>({ showBounds: false, showDirections: false, showIds: false, showTarget: false, annotations: true });
  useEffect(() => () => viewer.current?.debugPresentation({ showBounds: false, showDirections: false, showIds: false, showTarget: false, annotations: true }), [viewer]);
  const toggle = (key: keyof Toggles) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    viewer.current?.debugPresentation(next);
  };
  const reset = () => {
    setExplosion(0);
    onSeek(0);
    viewer.current?.debugPresentation({ ...toggles, explosionAmount: 0 });
  };
  return <aside className="presentation-debug" aria-label="Presentation debug controls">
    <div><strong>Story diagnostics</strong><span>DEV</span></div>
    <label>Story progress <output>{progress.toFixed(3)}</output><input type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={event => onSeek(Number(event.target.value) / 1000)} /></label>
    <label>Explosion amount <output>{explosion}%</output><input type="range" min="0" max="100" value={explosion} onChange={event => { const value = Number(event.target.value); setExplosion(value); viewer.current?.debugPresentation({ explosionAmount: value / 100 }); }} /></label>
    <fieldset><legend>Scene helpers</legend>{(Object.keys(toggles) as (keyof Toggles)[]).map(key => <label key={key}><input type="checkbox" checked={toggles[key]} onChange={() => toggle(key)} />{key.replace(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase())}</label>)}</fieldset>
    <button onClick={reset}>Reset assembled pose</button>
    <details><summary>Assembly hierarchy · {model.parts.length} occurrences</summary><pre>{JSON.stringify(model.hierarchy ?? { name: model.name, meshes: model.parts.map((_, index) => index), children: [] }, null, 2)}</pre></details>
  </aside>;
}
