'use client';

import { useId } from 'react';
import { CHILDREN } from '@/components/child';
import { Button, PlanRow } from '@/components/kit';
import { SCENES } from '@/lib/child/scenes';
import { habitLabel, leverLabel } from './planFromAnswersRules';
import type { PlanFromAnswersProps, PlanRowKey } from './quizTypes';
import { QuizScreen } from './Scene';

/** What a row says while its answer is missing. Nothing is made up in its place. */
const NOT_SET = 'Not set';

/**
 * "Your plan, from your answers." (Figma 49:1573). Five rows, each read from the props: who the parent practices
 * with, the scene, the behavior to praise first, the daily moment and the first thing to work on.
 * A row leads back to its question only when the flow passes `onEdit`.
 *
 * The labels and `habitFor`, the rule that turns the hardest moments into `praise`, are in ./planFromAnswersRules.
 */
export function PlanFromAnswers({ step, steps, onBack, partner, sceneId, praise, anchor, focus, onEdit, onNext }: PlanFromAnswersProps) {
  const titleId = useId();
  const scene = SCENES.find((one) => one.id === sceneId);

  const rows: { key: PlanRowKey; label: string; value: string | null }[] = [
    { key: 'partner', label: 'Partner', value: CHILDREN[partner].name },
    { key: 'scene', label: 'Scene', value: scene ? scene.title : null },
    { key: 'praise', label: 'Praise to practice', value: praise ? habitLabel(praise) : null },
    { key: 'moment', label: 'Moment', value: anchor?.trim() || null },
    { key: 'focus', label: 'First focus', value: focus ? leverLabel(focus) : null },
  ];

  return (
    <QuizScreen
      step={step}
      steps={steps}
      onBack={onBack}
      art="plan"
      action={
        <Button fullWidth onClick={onNext}>
          Looks right
        </Button>
      }
    >
      <h1 id={titleId} className="text-title lg:text-title-xl">
        Your plan, from your answers.
      </h1>
      <ul aria-labelledby={titleId} className="mt-[8px] divide-y divide-line border-b border-line lg:mt-[24px]">
        {rows.map((row) => (
          <li key={row.key}>
            <PlanRow label={row.label} value={row.value ?? NOT_SET} onClick={onEdit ? () => onEdit(row.key) : undefined} />
          </li>
        ))}
      </ul>
    </QuizScreen>
  );
}
