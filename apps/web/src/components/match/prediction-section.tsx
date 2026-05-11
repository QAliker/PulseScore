import type { ApiPrediction } from '@/lib/api-types';

type Props = {
  prediction: ApiPrediction;
  homeTeamName: string;
  awayTeamName: string;
};

function parsePct(s: string): number {
  return parseFloat(s.replace('%', '')) || 0;
}

export function PredictionSection({ prediction, homeTeamName, awayTeamName }: Props) {
  const homePct = parsePct(prediction.percentHome);
  const drawPct = parsePct(prediction.percentDraw);
  const awayPct = parsePct(prediction.percentAway);

  const goalHome = parseFloat(prediction.goalHome) || 0;
  const goalAway = parseFloat(prediction.goalAway) || 0;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Tripartite probability bar */}
      <div className="flex flex-col gap-3">
        <div
          className="flex h-4 w-full overflow-hidden rounded-full"
          role="img"
          aria-label={`Win probability: ${homeTeamName} ${homePct}%, Draw ${drawPct}%, ${awayTeamName} ${awayPct}%`}
        >
          <div
            className="bg-primary transition-all"
            style={{ width: `${homePct}%` }}
          />
          <div
            className="bg-muted transition-all"
            style={{ width: `${drawPct}%` }}
          />
          <div
            className="bg-live transition-all"
            style={{ width: `${awayPct}%` }}
          />
        </div>

        <div className="flex items-start justify-between text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="font-black tabular text-primary">{homePct}%</span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {homeTeamName}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-black tabular text-foreground/70">{drawPct}%</span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Draw
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-black tabular text-live">{awayPct}%</span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {awayTeamName}
            </span>
          </div>
        </div>
      </div>

      {/* Predicted winner */}
      {prediction.winnerName && (
        <div className="flex flex-col gap-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Predicted winner
          </span>
          <span className="font-display text-xl font-extrabold">
            {prediction.winnerName}
          </span>
          {prediction.winnerComment && (
            <p className="text-sm text-muted-foreground italic">
              {prediction.winnerComment}
            </p>
          )}
        </div>
      )}

      {/* Advice */}
      {prediction.advice && (
        <div className="border-t border-border/60 pt-4">
          <p className="text-sm leading-relaxed text-foreground">{prediction.advice}</p>
        </div>
      )}

      {/* Stats row: goals + over/under */}
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Expected goals
          </span>
          <span className="font-display text-lg font-extrabold tabular">
            {goalHome.toFixed(1)}
            <span className="mx-1.5 text-sm font-normal text-muted-foreground">–</span>
            {goalAway.toFixed(1)}
          </span>
        </div>

        {prediction.underOver && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total goals
            </span>
            <span className="font-display text-lg font-extrabold tabular">
              {prediction.underOver}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
