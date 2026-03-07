import { RANK_EMOJI, RANK_MEDAL } from '../../constants/rank';

describe('rank constants', () => {
  it('RANK_EMOJI has medals for 1, 2, 3', () => {
    expect(RANK_EMOJI[1]).toBe('🥇');
    expect(RANK_EMOJI[2]).toBe('🥈');
    expect(RANK_EMOJI[3]).toBe('🥉');
  });

  it('RANK_MEDAL is same as RANK_EMOJI', () => {
    expect(RANK_MEDAL).toBe(RANK_EMOJI);
    expect(RANK_MEDAL[1]).toBe('🥇');
  });
});
