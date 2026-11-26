import React from 'react';
import Toaster from './Toaster';
import ScrollRail from './ScrollRail';
import Announcer from './Announcer';
import Shortcuts from './Shortcuts';
import LineWatcher from './LineWatcher';

/** Everything that floats above the page. */
export default function FxLayer({ panel }) {
  return (
    <>
      <Toaster />
      {!panel && <ScrollRail />}
      {!panel && <Announcer />}
      <Shortcuts />
      <LineWatcher />
    </>
  );
}
