export interface VenueBeerDto {
  beerId: number;
  beerName: string;
  breweryName: string;
  styleName: string;
  family: string;
  status: string;
  lastConfirmedAt: string | null;
  recentVoterCount: number;
  nextVoteAt: string | null;
}
