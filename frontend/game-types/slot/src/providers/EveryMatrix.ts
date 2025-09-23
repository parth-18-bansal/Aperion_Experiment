import { IProviderInfo } from "../interfaces";

export function Everymatrix(url: string): IProviderInfo {
  const params = new URLSearchParams(url);
  return {
    id: "everymatrix", // Unique identifier for the client
    name: "everymatrix", // Display name of the client
    gameId: params.get("gameId") || "", // Unique identifier for the game instance
    lobbyUrl: params.get("LobbyUrl") || "", // Optional URL to the client's lobby
    logoUrl: "", // Optional URL to the client's logo
    description: "Everymatrix provideer", // Optional description of the client
    currency: params.get("currencyCode") || "USD", // Optional currency used by the client
    gameplayMode: params.get("freePlay") === "true" ? "fun" : "real", // Gameplay mode supported by the client
    token: params.get("token") || undefined, // Token for authentication;
    testerToken: params.get("TesterToken") || undefined, // Optional token for testing purposes
    clientId: params.get("clientId") || "9", // Optional client ID for the provider
  };
}
