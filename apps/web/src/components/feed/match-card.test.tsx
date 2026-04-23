import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchCard } from './match-card';
import type { Match } from '@/lib/types';

function makeMatch(over: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    leagueSlug: 'england-championship',
    kickoff: '2026-04-15T15:00:00Z',
    status: 'live',
    minute: 67,
    stoppage: null,
    home: { id: 'h', name: 'Leeds United', shortName: 'LEE' },
    away: { id: 'a', name: 'Burnley', shortName: 'BUR' },
    homeScore: 2,
    awayScore: 1,
    odds: { home: 2.1, draw: 3.3, away: 3.4 },
    goalscorers: [],
    cards: [],
    substitutions: [],
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe('<MatchCard>', () => {
  it('renders team names, score, and minute for a live match', () => {
    render(<MatchCard match={makeMatch()} />);
    expect(screen.getByText('Leeds United')).toBeInTheDocument();
    expect(screen.getByText('Burnley')).toBeInTheDocument();
    expect(screen.getByLabelText('Leeds United 2 Burnley 1')).toBeInTheDocument();
    expect(screen.getByText("67'")).toBeInTheDocument();
  });

  it('shows FT label and "vs" copy for scheduled matches', () => {
    render(
      <MatchCard match={makeMatch({ status: 'scheduled', minute: null, homeScore: 0, awayScore: 0 })} />,
    );
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('shows FT label for finished matches', () => {
    render(<MatchCard match={makeMatch({ status: 'finished', minute: null })} />);
    expect(screen.getByText('FT')).toBeInTheDocument();
  });

  it('fires onToggleFavorite with the match id when the star is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<MatchCard match={makeMatch()} onToggleFavorite={onToggle} />);
    await user.click(screen.getByRole('button', { name: /add to favorites/i }));
    expect(onToggle).toHaveBeenCalledWith('m1');
  });

  it('reflects favorite state via aria-pressed', () => {
    render(<MatchCard match={makeMatch()} isFavorite />);
    const btn = screen.getByRole('button', { name: /remove from favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces the full scoreline for screen readers via aria-label on the score link', () => {
    render(<MatchCard match={makeMatch()} />);
    expect(
      screen.getByLabelText('Leeds United 2 Burnley 1'),
    ).toBeInTheDocument();
  });
});
