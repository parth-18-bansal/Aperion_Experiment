import { IProviderInfo } from '../crash/interfaces';

export function Everymatrix(url = window.location.search): IProviderInfo {
  const params      = new URLSearchParams(url);
  const modeParam   = params.get('mode');
  const validModes  = ['local', 'prod', 'stage', 'dev'] as const;
  const mode        = modeParam && validModes.includes(modeParam as any) ? modeParam as typeof validModes[number] : 'local';

  return {
    id          : 'everymatrix',                                                      // Unique identifier for the client
    name        : 'everymatrix',                                                      // Display name of the client
    gameId      : params.get('gameId') || '',                                         // Unique identifier for the game instance
    description : 'Everymatrix provider',                                             // Optional description of the provider
    currency    : params.get('currencyCode') || 'USD',    
    mode        : mode,                                                               // Optional mode used by the client
    freePlay    : params.get('freePlay') === 'true' || false,                         // If true, the game is in free play mode
    token       : params.get('token') || undefined,                                   // Token for authentication;
    clientId    : params.get('clientId') || '1990',                                   // Optional client ID for the provider
    language    : params.get('language') || navigator.language.split('-')[0] || 'en',
    cashierUrl  : params.get('cashierUrl') || '',
    lobbyUrl    : params.get('LobbyUrl') || '',                                       // Optional URL to the client's lobby
    mobile      : params.get('mobile') === 'true' || false,                         // If true, the game is in mobile mode
    logoUrl     : '',                                                                 // Optional URL to the client's logo
  };
}
