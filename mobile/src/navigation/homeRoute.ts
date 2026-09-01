/*
  Where "home" is.

  Phase one ships the Social module only. The hub — the nine-tile grid in
  `screens/HomeScreen.tsx` — is a menu with one working entry, so the app opens
  straight into Social instead of asking people to tap through a chooser with
  eight locked tiles on it.

  The hub is deliberately still here: still written, still registered in the
  navigator, still reachable by name. It is parked, not deleted, because the
  moment a second module ships it becomes the right screen again.

  ---------------------------------------------------------------------------
  TO BRING THE HUB BACK: set HUB_ENABLED to true. That is the whole change.
  ---------------------------------------------------------------------------

  Every "home" button in the app routes through HOME_ROUTE rather than naming a
  screen, which is what makes that one line enough. Naming "HomeScreen" directly
  is how the footers ended up scattering people out of Social in the first
  place: the social footer, the messenger footer reached from Social's inbox,
  and the food tab bar each hardcoded it, so a Home tap inside the module
  dropped you outside it.
*/

export const HUB_ENABLED = false;

/** The screen a "home" tap lands on, and where a finished login sends people. */
export const HOME_ROUTE = HUB_ENABLED ? 'HomeScreen' : 'HomeSocial';

/*
  For `navigation.reset` at the end of a login. Home is the bottom of the stack:
  there is nothing sensible to go "back" to from it, and leaving the auth
  screens underneath means the hardware back button returns to a login form the
  person has already completed.
*/
export const HOME_RESET = {
  index: 0,
  routes: [{ name: HOME_ROUTE }],
} as const;
