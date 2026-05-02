export async function runReviewAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  console.log(`[ReviewAgent] Starting scan for clinic: ${tablePrefix}`);

  // Simulate soliciting reviews
  console.log(
    `[ReviewAgent] Found 3 recent 5-star experiences, soliciting reviews...`,
  );
  console.log(
    `[ReviewAgent] Scan complete for ${tablePrefix}: 3 items processed`,
  );

  return 3;
}
