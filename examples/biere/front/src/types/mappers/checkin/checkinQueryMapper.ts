export const checkinQueryToSearchParams = (beerId: number | null, page: number): URLSearchParams => {
  const params = new URLSearchParams();
  if (beerId !== null) params.append("beerId", beerId.toString());
  params.append("page", page.toString());
  return params;
};
