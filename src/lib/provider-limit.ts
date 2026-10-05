/** Provider adapters must raise this for quota/rate limits, including terminal stream failures. */
export class ProviderLimitError extends Error {
  constructor() {
    super(
      "AI usage limit reached. Unfinished work is saved. Resume this project when you return and usage is available. No paid fallback will run.",
    );
    this.name = "ProviderLimitError";
  }
}
