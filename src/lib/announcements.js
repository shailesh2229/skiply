// Announcement scripts in English, Hindi and Gujarati, written the way
// Indian station announcers actually speak ("यात्रीगण कृपया ध्यान दें…").
import { CAT_WORDS, tokenWords, waitWords } from './voice';

const OPEN = { en: 'Attention please.', hi: 'यात्रीगण कृपया ध्यान दें।', gu: 'મુસાફરો કૃપા કરી ધ્યાન આપે.' };

export const SCRIPTS = {
  quick: ({ name, wait }) => {
    const w = waitWords(wait);
    const walk = wait <= 2;
    return {
      title: { en: `Shortest line · ${name}`, hi: `सबसे छोटी लाइन · ${name}`, gu: `સૌથી ટૂંકી લાઇન · ${name}` },
      body: walk
        ? { en: 'Walk in right now. There is no wait.', hi: 'अभी सीधे जाइए, कोई प्रतीक्षा नहीं है।', gu: 'હમણાં સીધા જાઓ, કોઈ રાહ જોવાની નથી.' }
        : { en: `The shortest line near you. About ${w.en} wait.`, hi: `आपके पास सबसे छोटी लाइन। लगभग ${w.hi} की प्रतीक्षा।`, gu: `તમારી નજીક સૌથી ટૂંકી લાઇન. આશરે ${w.gu} રાહ.` },
      say: walk
        ? { en: `${OPEN.en} ${name} has no line right now. You can walk straight in.`, hi: `${OPEN.hi} ${name} पर अभी कोई लाइन नहीं है। आप सीधे जा सकते हैं।`, gu: `${OPEN.gu} ${name} પર હમણાં કોઈ લાઇન નથી. તમે સીધા જઈ શકો છો.` }
        : { en: `${OPEN.en} The shortest line near you is at ${name}. The waiting time is about ${w.en}.`, hi: `${OPEN.hi} आपके पास सबसे छोटी लाइन ${name} पर है। प्रतीक्षा समय लगभग ${w.hi} है।`, gu: `${OPEN.gu} તમારી નજીક સૌથી ટૂંકી લાઇન ${name} પર છે. રાહ જોવાનો સમય આશરે ${w.gu} છે.` },
    };
  },
  busy: ({ name, wait, alt, altWait }) => {
    const w = waitWords(wait), a = alt ? waitWords(altWait) : null;
    return {
      title: { en: `Long wait · ${name}`, hi: `लंबी प्रतीक्षा · ${name}`, gu: `લાંબી રાહ · ${name}` },
      body: alt
        ? { en: `About ${w.en} there. ${alt} is quicker, about ${a.en}.`, hi: `वहाँ लगभग ${w.hi}। ${alt} पर लगभग ${a.hi}।`, gu: `ત્યાં આશરે ${w.gu}. ${alt} પર આશરે ${a.gu}.` }
        : { en: `About ${w.en} in line. Consider booking a slot.`, hi: `लगभग ${w.hi} की लाइन। पहले से स्लॉट बुक करें।`, gu: `આશરે ${w.gu} ની લાઇન. પહેલેથી સ્લોટ બુક કરો.` },
      say: alt
        ? { en: `Passengers going to ${name}, please note. The wait there is about ${w.en}. ${alt} is quicker, about ${a.en}.`,
          hi: `${name} जाने वाले यात्री कृपया ध्यान दें। वहाँ लगभग ${w.hi} की प्रतीक्षा है। ${alt} पर कम समय लगेगा, लगभग ${a.hi}।`,
          gu: `${name} જનારા મુસાફરો કૃપા કરી ધ્યાન આપે. ત્યાં આશરે ${w.gu} રાહ જોવી પડશે. ${alt} પર ઓછો સમય લાગશે, આશરે ${a.gu}.` }
        : { en: `Passengers going to ${name}, please note. The wait there is about ${w.en}. Please book a slot in advance.`,
          hi: `${name} जाने वाले यात्री कृपया ध्यान दें। वहाँ लगभग ${w.hi} की प्रतीक्षा है। कृपया पहले से स्लॉट बुक करें।`,
          gu: `${name} જનારા મુસાફરો કૃપા કરી ધ્યાન આપે. ત્યાં આશરે ${w.gu} રાહ જોવી પડશે. કૃપા કરી પહેલેથી સ્લોટ બુક કરો.` },
    };
  },
  closing: ({ name, mins }) => ({
    title: { en: `Last call · ${name}`, hi: `अंतिम सूचना · ${name}`, gu: `છેલ્લી સૂચના · ${name}` },
    body: { en: `Closes in ${mins} minutes.`, hi: `${mins} मिनट में बंद होगा।`, gu: `${mins} મિનિટમાં બંધ થશે.` },
    say: { en: `Last call for ${name}. It closes in ${mins} minutes.`, hi: `${name} के लिए अंतिम सूचना। यह ${mins} मिनट में बंद हो जाएगा।`, gu: `${name} માટે છેલ્લી સૂચના. તે ${mins} મિનિટમાં બંધ થશે.` },
  }),
  count: ({ n, cat, city }) => {
    const c = CAT_WORDS[cat];
    return {
      title: { en: `${n} ${c.en} open · ${city}`, hi: `${n} ${c.hi} खुले · ${city}`, gu: `${n} ${c.gu} ખુલ્લા · ${city}` },
      body: { en: `${n} ${c.en} near you are likely open right now.`, hi: `आपके पास ${n} ${c.hi} अभी खुले हैं।`, gu: `તમારી નજીક ${n} ${c.gu} હમણાં ખુલ્લા છે.` },
      say: { en: `${OPEN.en} ${n} ${c.en} near ${city} are open right now.`, hi: `${OPEN.hi} ${city} के पास ${n} ${c.hi} अभी खुले हैं।`, gu: `${OPEN.gu} ${city} પાસે ${n} ${c.gu} હમણાં ખુલ્લા છે.` },
    };
  },
  tip: () => ({
    title: { en: 'Help other passengers', hi: 'दूसरे यात्रियों की मदद करें', gu: 'બીજા મુસાફરોની મદદ કરો' },
    body: { en: 'Tell us how long the line is on any venue page.', hi: 'किसी भी जगह के पेज पर लाइन की जानकारी दें।', gu: 'કોઈપણ સ્થળના પેજ પર લાઇનની માહિતી આપો.' },
    say: { en: `${OPEN.en} Help other passengers. Report the line on any venue page.`, hi: `${OPEN.hi} दूसरे यात्रियों की मदद करें। किसी भी जगह के पेज पर लाइन की जानकारी दें।`, gu: `${OPEN.gu} બીજા મુસાફરોની મદદ કરો. કોઈપણ સ્થળના પેજ પર લાઇનની માહિતી આપો.` },
  }),
  // ---- your own tickets ----
  soon: ({ token, name, ahead }) => {
    const t = tokenWords(token);
    return {
      title: { en: 'Almost your turn', hi: 'आपकी बारी आने वाली है', gu: 'તમારો વારો આવવાનો છે' },
      body: { en: `${name} · token ${token}. About ${ahead} ahead of you. Head to the counter.`, hi: `${name} · टोकन ${token}। आपसे आगे लगभग ${ahead} लोग।`, gu: `${name} · ટોકન ${token}. તમારી આગળ આશરે ${ahead} લોકો.` },
      say: { en: `Attention please. Token ${t}, your turn at ${name} is coming up. Please move towards the counter.`,
        hi: `कृपया ध्यान दें। टोकन नंबर ${t}, ${name} पर आपकी बारी आने वाली है। कृपया काउंटर की ओर बढ़ें।`,
        gu: `કૃપા કરી ધ્યાન આપો. ટોકન નંબર ${t}, ${name} પર તમારો વારો આવવાનો છે. કૃપા કરી કાઉન્ટર તરફ આગળ વધો.` },
    };
  },
  now: ({ token, name, dept }) => {
    const t = tokenWords(token);
    return {
      title: { en: 'It’s your turn', hi: 'आपकी बारी है', gu: 'તમારો વારો છે' },
      body: { en: `${name} · token ${token} · ${dept}. Show your QR at the counter.`, hi: `${name} · टोकन ${token}। काउंटर पर QR दिखाएँ।`, gu: `${name} · ટોકન ${token}. કાઉન્ટર પર QR બતાવો.` },
      say: { en: `Token number ${t}, please proceed to the counter at ${name}.`, hi: `टोकन नंबर ${t}, कृपया ${name} के काउंटर पर पधारें।`, gu: `ટોકન નંબર ${t}, કૃપા કરી ${name} ના કાઉન્ટર પર પધારો.` },
    };
  },
  leave: ({ name, by }) => ({
    title: { en: 'Time to leave', hi: 'निकलने का समय', gu: 'નીકળવાનો સમય' },
    body: { en: `Leave by ${by} to reach ${name} on time.`, hi: `${name} समय पर पहुँचने के लिए ${by} तक निकलें।`, gu: `${name} સમયસર પહોંચવા ${by} સુધીમાં નીકળો.` },
    say: { en: `It is time to leave for ${name}.`, hi: `${name} के लिए निकलने का समय हो गया है।`, gu: `${name} માટે નીકળવાનો સમય થઈ ગયો છે.` },
  }),
  watch: ({ name, wait }) => {
    const w = waitWords(wait);
    return {
      title: { en: `Good time to go · ${name}`, hi: `जाने का अच्छा समय · ${name}`, gu: `જવાનો સારો સમય · ${name}` },
      body: { en: `The line is down to about ${w.en}.`, hi: `लाइन अब लगभग ${w.hi} की है।`, gu: `લાઇન હવે આશરે ${w.gu} ની છે.` },
      say: { en: `Good news. The line at ${name} is now about ${w.en}. This is a good time to go.`,
        hi: `खुशखबरी। ${name} पर लाइन अब लगभग ${w.hi} की है। जाने का यह अच्छा समय है।`,
        gu: `ખુશખબર. ${name} પર લાઇન હવે આશરે ${w.gu} ની છે. જવાનો આ સારો સમય છે.` },
    };
  },
};

/** Pick the text language for on-screen toasts from the voice setting. */
export const screenLang = (mode) => (mode === 'hi' || mode === 'gu' ? mode : 'en');
