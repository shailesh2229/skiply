import React, { createContext, useContext, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { chime, speak } from '../../../lib/fx';
import useQueueSim from './useQueueSim';

const Ctx = createContext(null);
/** The one live line for the claimed business, shared by Home, Live queue and the TV display. */
export const useSim = () => useContext(Ctx);

export const spokenToken = (token) => token.replace('-', ' ').replace(/(\d)/g, ' $1').replace(/\s+/g, ' ').trim();

export function SimProvider({ venue, setup, children }) {
  const { tickets } = useApp();
  const sim = useQueueSim(venue, tickets, setup);

  // Every call is announced once, wherever the owner pressed the button.
  useEffect(() => sim.onCall((c) => {
    if (!c.manual || setup?.announce === false) return;
    chime('dingdong', true);
    setTimeout(() => speak(`Token ${spokenToken(c.p.token)}, please come to counter ${c.counter}.`, true), 900);
  }), [sim.onCall, setup?.announce]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ ...sim, venue, setup }}>{children}</Ctx.Provider>;
}
