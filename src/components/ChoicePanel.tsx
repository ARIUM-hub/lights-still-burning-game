import type { Choice } from '../engine/types'

interface ChoicePanelProps {
  choices: Choice[]
  onChoose(choiceId: string): void
}

export function ChoicePanel({ choices, onChoose }: ChoicePanelProps) {
  return (
    <fieldset className="choice-panel">
      <legend className="sr-only">选择你的回应</legend>
      <div className="choice-panel__options">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            className="choice-panel__option"
            data-choice-id={choice.id}
            onClick={() => onChoose(choice.id)}
          >
            <span className="choice-panel__index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="choice-panel__label">{choice.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
