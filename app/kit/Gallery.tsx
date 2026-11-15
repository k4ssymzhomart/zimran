'use client';

/**
 * The visual test bench of the Split kit: every kit and shell component, in labeled sections, with props.
 *
 * The sample values in this file exist for this page only. Never import them, or this file, from product code:
 * product screens read real data from the stores and show an empty state when there is none.
 */
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ART,
  AiSummaryCard,
  Art,
  Avatar,
  Button,
  CheckIn,
  Chip,
  ChipGroup,
  ChoiceTile,
  Composer,
  Divider,
  ICON_NAMES,
  Icon,
  IconButton,
  LastSessionCard,
  Logo,
  LogoMark,
  MonthCalendar,
  NowAndGoal,
  NumberTile,
  Option,
  PARENT,
  PageScreen,
  Pattern,
  PatternRow,
  Picture,
  PlanRow,
  Player,
  Portrait,
  QuizProgress,
  RewriteCard,
  Ring,
  Rings,
  RowChevron,
  SCENE_ART,
  Segmented,
  SessionRow,
  SettingRow,
  SettingsSection,
  ShareCard,
  Sheet,
  SplitScreen,
  SummaryCard,
  Tag,
  TextField,
  Tile,
  Toggle,
  TranscriptRow,
  WeekStrip,
  cn,
  type ArtName,
  type MicState,
  type PatternKind,
  type PlayerHandle,
  type WeekDay,
} from '@/components/kit';
import { AppShell } from '@/components/shell/AppShell';
import { Rail } from '@/components/shell/Rail';
import { TabBar } from '@/components/shell/TabBar';
import { TopBar } from '@/components/shell/TopBar';
import { ROUTES } from '@/lib/routes';
import type { SavedSentence } from '@/lib/types';

// ---------- sample values, for this page only ----------

/** Every sample link stays on this page. */
const HERE = ROUTES.kit;

const SENTENCES: SavedSentence[] = [
  { text: 'You are stacking the red one.', code: 'description', startSec: 4, atSec: 6 },
  { text: 'Good job stacking so gently.', code: 'specific_praise', startSec: 11, atSec: 13 },
  { text: 'What are you building?', code: 'question', startSec: 19, atSec: 21 },
  { text: 'You made a tower!', code: 'reflection', startSec: 27, atSec: 28 },
  { text: 'Put it here.', code: 'command', startSec: 35, atSec: 36, disputed: true },
];

const WEEK: WeekDay[] = [
  { date: '2026-11-09', label: 'M', name: 'Monday, played', played: true, href: HERE },
  { date: '2026-11-10', label: 'T', name: 'Tuesday, played', played: true, href: HERE },
  { date: '2026-11-11', label: 'W', name: 'Wednesday, played', played: true, href: HERE },
  { date: '2026-11-12', label: 'T', name: 'Thursday, played', played: true, href: HERE },
  { date: '2026-11-13', label: 'F', name: 'Friday, not played', played: false, today: true },
  { date: '2026-11-14', label: 'S', name: 'Saturday, not played', played: false },
  { date: '2026-11-15', label: 'S', name: 'Sunday, not played', played: false },
];

const PLAYED = ['2026-11-05', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
const DOTTED = ['2026-11-09', '2026-11-10', '2026-11-12'];
const TODAY = '2026-11-13';

const RINGS = {
  praise: { value: 6, progress: 0.6, delta: '+4' },
  reflect: { value: 4, progress: 0.4, delta: '+1' },
  describe: { value: 7, progress: 0.7, delta: '+2' },
  swap: { value: 9, delta: '−3' },
};

const COUNTS = { specific_praise: 6, reflection: 4, description: 7, avoid: 9 };
const HEADLINE = 'Six praises, nine questions.';
const AI_SUMMARY =
  'You described what Mia built almost every time she spoke. Most of your questions came in the first minute, before she had started. Tomorrow, say what you see for the first ten seconds.';

const MOMENTS: ReadonlyArray<{ value: string; label: string; art: ArtName }> = [
  { value: 'mornings', label: 'Mornings', art: 'alarm' },
  { value: 'mealtimes', label: 'Mealtimes', art: 'dinner' },
  { value: 'leaving', label: 'Leaving the house', art: 'door' },
  { value: 'bedtime', label: 'Bedtime', art: 'moon' },
];

const AGES = ['2', '3', '4', '5', '6', '7'].map((age) => ({ value: age, label: age }));
const PARTNERS = [
  { value: 'mia', label: 'Mia' },
  { value: 'leo', label: 'Leo' },
];
const VIEWS = [
  { value: 'trends', label: 'Trends' },
  { value: 'sessions', label: 'Sessions' },
];
const HARD_MOMENTS = [
  { value: '0', label: 'None' },
  { value: '1-2', label: '1–2' },
  { value: '3-5', label: '3–5' },
  { value: '6+', label: '6 or more' },
];

const RECORDING_SEC = 20;
/** Loudness per slice for the waveform sample: a fixed wave, not a measurement. */
const PEAKS = Array.from({ length: 44 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7)));

/** Seconds of silence as a WAV file made in the browser, so the player has a real source without a sample file. */
function silence(seconds: number): string {
  const rate = 8000;
  const samples = rate * seconds;
  const wav = new DataView(new ArrayBuffer(44 + samples));
  const text = (at: number, value: string) => [...value].forEach((char, i) => wav.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  wav.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, rate, true);
  wav.setUint32(28, rate, true);
  wav.setUint16(32, 1, true);
  wav.setUint16(34, 8, true);
  text(36, 'data');
  wav.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) wav.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
}

let silentUrl: string | null = null;
const silentRecording = (): string => (silentUrl ??= silence(RECORDING_SEC));
const noRecording = (): null => null;
const never = () => () => {};

// ---------- page furniture ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[20px]">
      <h2 className="border-b border-line pb-[8px] text-title">{title}</h2>
      {children}
    </section>
  );
}

/** One labeled sample. `violet` puts it on the violet block, where the component lives in Figma. */
function Sample({ name, violet = false, className, children }: { name: string; violet?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[8px]">
      <h3 className="text-small text-gray">{name}</h3>
      <div className={cn(violet && 'rounded-[24px] bg-violet p-[24px] text-white', className)}>{children}</div>
    </div>
  );
}

const ROW = 'flex flex-wrap items-center gap-[12px]';
/** The width of the words on a phone: 390 less two 24px gutters. */
const PHONE = 'w-full max-w-[342px]';
/** A phone-sized window on small screens, the whole width from 1024px, where the shells switch to their desktop layout. */
const SCREEN = 'mx-auto flex h-[760px] w-full max-w-[390px] flex-col overflow-clip rounded-[32px] border border-line lg:h-dvh lg:max-w-none';

// ---------- sections ----------

function Brand() {
  const patterns: PatternKind[] = ['bars', 'sentences', 'reps'];
  return (
    <Section title="Brand">
      <div className={ROW}>
        <Sample name="Logo, ink">
          <Logo />
        </Sample>
        <Sample name="Logo, violet">
          <Logo tone="violet" />
        </Sample>
        <Sample name="Logo, white" violet>
          <Logo tone="white" />
        </Sample>
        <Sample name="LogoMark, 18 and 30" className={ROW}>
          <LogoMark />
          <LogoMark size={30} />
        </Sample>
      </div>
      <div className="flex flex-wrap gap-[16px]">
        {patterns.map((kind) => (
          <Sample key={kind} name={`Pattern, ${kind}, 390 × 300`}>
            <div className="relative h-[300px] w-[390px] max-w-full overflow-clip bg-violet">
              <Pattern kind={kind} />
            </div>
          </Sample>
        ))}
      </div>
      <Sample name="Icon: every name, at 24">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[8px]">
          {ICON_NAMES.map((name) => (
            <li key={name} className="flex flex-col items-center gap-[8px] rounded-[16px] bg-mist px-[4px] py-[14px] text-small text-gray">
              <Icon name={name} className="text-ink" />
              {name}
            </li>
          ))}
        </ul>
      </Sample>
      <div className={ROW}>
        <Sample name="Icon, at the sizes Figma uses: 24, 22, 20, 18" className={ROW}>
          <Icon name="mic" />
          <Icon name="mic" size={22} />
          <Icon name="chevron-right" size={20} className="text-faint" />
          <Icon name="chevron-right" size={18} />
          <Icon name="check" size={20} className="text-violet" />
          <Icon name="check" size={18} className="text-violet" />
          <Icon name="play" size={20} className="text-violet" />
          <Icon name="play" size={18} className="text-violet" />
          <Icon name="arrow-right" size={18} className="text-faint" />
        </Sample>
        <Sample name="Icon, on violet, with a name for screen readers" violet className={ROW}>
          <Icon name="back" />
          <Icon name="close" />
          <Icon name="speaker" title="Sound is on" />
          <Icon name="speaker-off" title="Sound is off" />
          <Icon name="mic" size={22} />
          <Icon name="arrow-up" size={22} strokeWidth={2.4} />
          <Icon name="check" size={18} />
        </Sample>
      </div>
    </Section>
  );
}

function Pictures() {
  const objects: ArtName[] = ['blocks', 'sun', 'medal-flame', 'sparkle', 'clipboard', 'earbud'];
  return (
    <Section title="Pictures">
      <Sample name="Art, 64" violet className={ROW}>
        {objects.map((name) => (
          <Art key={name} name={name} size={64} />
        ))}
      </Sample>
      <Sample name="Portrait: faces at 120, full-body poses at 160" violet className={cn(ROW, 'items-end')}>
        <Portrait partner="mia" size={120} alt="Mia" />
        <Portrait partner="leo" pose="beaming" size={120} alt="Leo" />
        <Portrait partner="mia" pose="body-waving" size={160} alt="Mia" />
        <Portrait partner="leo" pose="body-car" size={160} alt="Leo" />
      </Sample>
      <Sample name="Picture: a parent, a scene" violet className={cn(ROW, 'items-end')}>
        <Picture file={PARENT.mum} size={120} />
        <Picture file={SCENE_ART['mum-mia']} size={200} />
      </Sample>
      <Sample name="Avatar, 40, 56 and 72" className={ROW}>
        <Avatar partner="leo" size={40} alt="Leo" />
        <Avatar partner="mia" alt="Mia" />
        <Avatar partner="mia" pose="pouting" size={72} alt="Mia" />
      </Sample>
    </Section>
  );
}

function Actions() {
  return (
    <Section title="Actions">
      <Sample name="Button: ink, violet, soft, ghost" className={ROW}>
        <Button>Start five minutes</Button>
        <Button variant="violet">Start a round</Button>
        <Button variant="soft">Share summary</Button>
        <Button variant="ghost">Not now</Button>
      </Sample>
      <Sample name="Button: 48px, a link, with an icon, disabled" className={ROW}>
        <Button size="md">Start free</Button>
        <Button href={HERE}>Review today’s session</Button>
        <Button variant="soft" icon={<Art name="play" size={24} />}>
          Listen
        </Button>
        <Button disabled>Next</Button>
      </Sample>
      <Sample name="Button: white, on violet" violet className={ROW}>
        <Button variant="white">Open my plan</Button>
        <Button variant="white" disabled>
          Next
        </Button>
      </Sample>
      <Sample name="Button, full width" className={PHONE}>
        <Button fullWidth>Start five minutes</Button>
      </Sample>
      <Sample name="IconButton: plain, ink, violet" className={ROW}>
        <IconButton label="Back">
          <Icon name="back" />
        </IconButton>
        <IconButton label="Close" href={HERE}>
          <Icon name="close" />
        </IconButton>
        <IconButton label="Close" variant="ink">
          <Icon name="close" />
        </IconButton>
        <IconButton label="Back" variant="violet">
          <Icon name="back" />
        </IconButton>
        <IconButton label="Back" disabled>
          <Icon name="back" />
        </IconButton>
      </Sample>
      <Sample name="IconButton, on violet" violet className={ROW}>
        <IconButton label="Back" variant="on-violet">
          <Icon name="back" />
        </IconButton>
        <IconButton label="Close" variant="on-violet">
          <Icon name="close" />
        </IconButton>
      </Sample>
    </Section>
  );
}

function Choices() {
  const [filter, setFilter] = useState(true);
  const [age, setAge] = useState<string | null>('4');
  const [moment, setMoment] = useState('bedtime');
  const [moments, setMoments] = useState<string[]>(['mornings']);
  const [partner, setPartner] = useState('mia');
  const [view, setView] = useState('trends');
  const [hard, setHard] = useState<string | null>(null);
  const [audio, setAudio] = useState(true);
  const [scene, setScene] = useState<string | null>('blocks');
  const scenes = [
    { value: 'blocks', label: 'Blocks' },
    { value: 'drawing', label: 'Drawing' },
  ];
  const toggleMoment = (value: string, on: boolean) => setMoments((all) => (on ? [...all, value] : all.filter((m) => m !== value)));

  return (
    <Section title="Choices">
      <Sample name="Chip: a label, a toggle, disabled" className={ROW}>
        <Chip>Blocks</Chip>
        <Chip selected={filter} onClick={() => setFilter(!filter)}>
          Recorded
        </Chip>
        <Chip onClick={() => {}} disabled>
          Live
        </Chip>
      </Sample>
      <Sample name="ChipGroup">
        <ChipGroup label="Age" options={AGES} value={age} onChange={setAge} />
      </Sample>
      <Sample name="Chip and ChipGroup, on violet: a label, then one choice" violet className={ROW}>
        <Chip tone="on-violet">Simulated child</Chip>
        <ChipGroup label="Scene" options={scenes} value={scene} onChange={setScene} tone="on-violet" />
      </Sample>
      <Sample name="Tag: skill, quiet, swap" className={ROW}>
        <Tag tone="skill">Specific praise</Tag>
        <Tag tone="quiet">Beta</Tag>
        <Tag tone="swap">Question, to swap</Tag>
      </Sample>
      <Sample name="Option, one choice, with pictures" className={PHONE}>
        <div role="radiogroup" aria-label="Hardest moment" className="flex flex-col gap-[10px]">
          {MOMENTS.map((m) => (
            <Option key={m.value} name="kit-option" value={m.value} label={m.label} art={ART[m.art].src} selected={moment === m.value} onChange={() => setMoment(m.value)} />
          ))}
        </div>
      </Sample>
      <Sample name="Option, several choices, text only" className={PHONE}>
        <div role="group" aria-label="Hardest moments" className="flex flex-col gap-[10px]">
          {MOMENTS.map((m) => (
            <Option key={m.value} multiple label={m.label} selected={moments.includes(m.value)} onChange={(on) => toggleMoment(m.value, on)} />
          ))}
          <Option label="Sharing" selected={false} onChange={() => {}} disabled />
        </div>
      </Sample>
      <Sample name="ChoiceTile" className={PHONE}>
        <div role="group" aria-label="Hardest moments" className="grid grid-cols-2 gap-[10px]">
          {MOMENTS.map((m) => (
            <ChoiceTile key={m.value} multiple label={m.label} art={ART[m.art].src} selected={moments.includes(m.value)} onChange={(on) => toggleMoment(m.value, on)} />
          ))}
        </div>
      </Sample>
      <Sample name="NumberTile: the ages of the quiz, then the small size" className={cn(PHONE, 'flex flex-col gap-[16px]')}>
        <div role="radiogroup" aria-label="Age" className="grid grid-cols-3 gap-[10px]">
          {AGES.map((a) => (
            <NumberTile key={a.value} name="kit-age" value={a.value} label={a.label} selected={age === a.value} onChange={() => setAge(a.value)} />
          ))}
        </div>
        <div role="radiogroup" aria-label="Age, small" className="grid grid-cols-6 gap-[8px]">
          {AGES.map((a) => (
            <NumberTile key={a.value} size="sm" name="kit-age-small" value={a.value} label={a.label} selected={age === a.value} onChange={() => setAge(a.value)} disabled={a.value === '7'} />
          ))}
        </div>
      </Sample>
      <Sample name="Tile" className={PHONE}>
        <div role="radiogroup" aria-label="Hardest moment" className="grid grid-cols-2 gap-[10px]">
          {MOMENTS.slice(0, 2).map((m) => (
            <Tile key={m.value} name="kit-tile" value={m.value} label={m.label} art={ART[m.art].src} selected={moment === m.value} onChange={() => setMoment(m.value)} />
          ))}
          <Tile name="kit-tile" value="bedtime" label="Bedtime" art={ART.moon.src} selected={moment === 'bedtime'} onChange={() => setMoment('bedtime')} />
        </div>
      </Sample>
      <Sample name="Segmented: hugging its labels, full width" className={cn(PHONE, 'flex flex-col items-start gap-[12px]')}>
        <Segmented label="Practice partner" options={PARTNERS} value={partner} onChange={setPartner} />
        <Segmented label="View" options={VIEWS} value={view} onChange={setView} fullWidth />
      </Sample>
      <Sample name="CheckIn" className={PHONE}>
        <CheckIn question="How many hard moments this week?" options={HARD_MOMENTS} value={hard} onChange={setHard} />
      </Sample>
      <Sample name="Toggle: on or off, disabled" className={ROW}>
        <Toggle label="Keep audio" checked={audio} onChange={setAudio} />
        <Toggle label="AI summaries" checked={false} onChange={() => {}} disabled />
        <Toggle label="Record live sessions" checked onChange={() => {}} disabled />
      </Sample>
    </Section>
  );
}

function ComposerSample({ start = '', mic }: { start?: string; mic?: MicState }) {
  const [value, setValue] = useState(start);
  const [listening, setListening] = useState(mic === 'listening');
  return (
    <Composer
      value={value}
      onChange={setValue}
      onSubmit={() => setValue('')}
      placeholder="Say something to Mia"
      onMic={() => setListening(!listening)}
      micState={mic === 'unavailable' ? mic : listening ? 'listening' : 'idle'}
    />
  );
}

function Fields() {
  const [name, setName] = useState('');
  return (
    <Section title="Fields">
      <Sample name="TextField" className={PHONE}>
        <TextField label="Your child’s name" value={name} onChange={setName} placeholder="Name" autoComplete="off" />
      </Sample>
      <Sample name="TextField, compact" className={PHONE}>
        <TextField compact label="Your child’s name, compact" value={name} onChange={setName} placeholder="Name" autoComplete="off" />
      </Sample>
      <Sample name="Composer: empty, typing, listening, no microphone" className={cn(PHONE, 'flex flex-col gap-[12px]')}>
        <ComposerSample />
        <ComposerSample start="You are stacking the red one." />
        <ComposerSample start="You made a" mic="listening" />
        <ComposerSample mic="unavailable" />
      </Sample>
    </Section>
  );
}

function Rows() {
  const [audio, setAudio] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [calendar, setCalendar] = useState(false);
  return (
    <Section title="Rows and small pieces">
      <Sample name="SettingRow: a link, a value, a tag, a switch, an action" className={PHONE}>
        <SettingRow label="Name" art={ART.nametag.src} value="Aru" href={HERE} />
        <Divider />
        <SettingRow label="Live with your child" art={ART.earbud.src} tag={<Tag tone="quiet">Beta</Tag>} href={HERE} />
        <Divider />
        <SettingRow label="Keep audio" art={ART.cassette.src} toggle={{ checked: audio, onChange: setAudio }} />
        <Divider />
        <SettingRow label="Erase everything on this device" art={ART.trash.src} onClick={() => setSheet(true)} />
      </Sample>
      <Sample name="SettingsSection" className="w-full max-w-[390px]">
        <SettingsSection title="Your plan">
          <SettingRow label="Day" art={ART.plan.src} value="5 of 28" href={HERE} />
          <SettingRow label="Daily moment" art={ART.dinner.src} value="After dinner" href={HERE} />
          <SettingRow label="Scene" art={ART.blocks.src} value="Blocks" href={HERE} />
        </SettingsSection>
      </Sample>
      <Sample name="SettingRow, compact" className={PHONE}>
        <SettingRow compact label="Praise" art={ART.praise.src} href={HERE} />
        <Divider />
        <SettingRow compact label="Reflect" art={ART.reflect.src} href={HERE} />
      </Sample>
      <Sample name="SettingsSection, card" className="w-full max-w-[403px]">
        <SettingsSection card title="Recordings">
          <SettingRow label="Keep audio" art={ART.cassette.src} toggle={{ checked: audio, onChange: setAudio }} />
          <SettingRow label="14 recordings" art={ART.phone.src} value="38 MB" href={HERE} />
        </SettingsSection>
      </Sample>
      <Sample name="PlanRow: a link, an action, plain" className={PHONE}>
        <PlanRow label="Partner" value="Mia" href={HERE} />
        <Divider />
        <PlanRow label="Daily moment" value="After dinner" onClick={() => setSheet(true)} />
        <Divider />
        <PlanRow label="Length" value="Five minutes" />
      </Sample>
      <Sample name="PlanRow, compact, as in a sheet" className={PHONE}>
        <Divider />
        <PlanRow compact label="Moment" value="After dinner" href={HERE} />
        <Divider />
        <PlanRow compact label="Repeats" value="Daily to 6 December" />
      </Sample>
      <Sample name="PatternRow, with a Divider between rows" className={PHONE}>
        <PatternRow label="Most questions began with" value="“What”" />
        <Divider />
        <PatternRow label="Longest run without a question" value="48 seconds" />
        <Divider />
        <PatternRow label="To swap, first half then second" value="7, then 2" />
      </Sample>
      <Sample name="Divider and RowChevron" className={cn(PHONE, 'flex flex-col gap-[12px]')}>
        <Divider />
        <RowChevron />
      </Sample>
      <Sample name="QuizProgress, step 3 of 9, on violet" violet className={PHONE}>
        <QuizProgress steps={9} current={3} />
      </Sample>
      <Sample name="Sheet: a confirm, then rows in the body and a picture of its own" className={ROW}>
        <Button variant="soft" onClick={() => setSheet(true)}>
          Open the sheet
        </Button>
        <Sheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="Erase everything on this device?"
          art={ART.door.src}
          primary={{ label: 'Erase everything', onClick: () => setSheet(false) }}
          secondary={{ label: 'Keep my data', onClick: () => setSheet(false) }}
        >
          Your sessions, recordings and plan. This cannot be undone.
        </Sheet>
        <Button variant="soft" onClick={() => setCalendar(true)}>
          Open the sheet with rows
        </Button>
        <Sheet
          open={calendar}
          onClose={() => setCalendar(false)}
          title="Put five minutes in your calendar."
          art={
            <div className="relative flex size-[76px] shrink-0 items-center justify-center overflow-clip rounded-[22px] bg-violet">
              <Pattern kind="reps" />
              <Art name="bell" size={52} className="relative" />
            </div>
          }
          primary={{ label: 'Add to calendar', onClick: () => setCalendar(false) }}
          secondary={{ label: 'Not now', onClick: () => setCalendar(false) }}
        >
          <Divider />
          <PlanRow compact label="Moment" value="After dinner" onClick={() => {}} />
          <Divider />
          <PlanRow compact label="Time" value="18:30" onClick={() => {}} />
          <Divider />
          <PlanRow compact label="Repeats" value="Daily to 6 December" />
        </Sheet>
      </Sample>
    </Section>
  );
}

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + by, 1)).toISOString().slice(0, 7);
}

function Numbers() {
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [openDay, setOpenDay] = useState('2026-11-10');
  return (
    <Section title="Numbers and time">
      <Sample name="Ring: empty, part, full" className={ROW}>
        <Ring progress={0} />
        <Ring progress={0.4}>
          <span className="text-body-strong">4</span>
        </Ring>
        <Ring progress={1} size={76}>
          <span className="text-heading">10</span>
        </Ring>
      </Sample>
      <Sample name="Rings, 60, with changes" className={PHONE}>
        <Rings {...RINGS} size={60} className="justify-between" />
      </Sample>
      <Sample name="Rings, 56, on violet, reflections not counted" violet className={PHONE}>
        <Rings praise={RINGS.praise} reflect={{ value: '–', progress: 0 }} describe={RINGS.describe} swap={{ value: 2 }} tone="violet" className="justify-between" />
      </Sample>
      <Sample name="Rings, 76, centered">
        <Rings praise={RINGS.praise} reflect={RINGS.reflect} describe={RINGS.describe} size={76} className="justify-center gap-[22px]" />
      </Sample>
      <Sample name="Rings, 76, on violet, 28 apart: a desktop row, it scrolls sideways on a phone" violet className="w-fit max-w-full overflow-x-auto">
        <Rings {...RINGS} size={76} tone="violet" className="gap-[28px]" />
      </Sample>
      <Sample name="NowAndGoal" className={PHONE}>
        <NowAndGoal
          now={{ praise: '1.0', reflect: '0.8', describe: '1.2', swap: '1.6' }}
          goal={{ praise: '2', reflect: '2', describe: '2', swap: '0.6' }}
          nowNote="From round two"
          goalNote="Checked over five minutes on 12 December"
        />
      </Sample>
      <Sample name="SummaryCard" className={PHONE}>
        <SummaryCard
          percent={38}
          facts={[
            { label: 'Strongest skill', value: 'Describe' },
            { label: 'First swap', value: 'Questions' },
            { label: 'Daily moment', value: 'After dinner' },
          ]}
        />
      </Sample>
      <Sample name="WeekStrip" className={PHONE}>
        <WeekStrip days={WEEK} />
      </Sample>
      <Sample name="MonthCalendar, the 10th open: tap a played day to open it" className={PHONE}>
        <MonthCalendar
          month={month}
          played={PLAYED}
          dotted={DOTTED}
          today={TODAY}
          selected={openDay}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, 1))}
          onSelectDay={setOpenDay}
        />
      </Sample>
      <Sample name="MonthCalendar, compact, no header" className="w-full max-w-[394px]">
        <MonthCalendar month="2026-11" played={PLAYED} dotted={DOTTED} today={TODAY} compact hideHeader />
      </Sample>
    </Section>
  );
}

function Sessions() {
  const [open, setOpen] = useState(true);
  const recording = useSyncExternalStore(never, silentRecording, noRecording);
  const player = useRef<PlayerHandle>(null);
  return (
    <Section title="Sessions">
      <Sample name="LastSessionCard" className={PHONE}>
        <LastSessionCard when="Yesterday" headline={HEADLINE} href={HERE} />
      </Sample>
      <Sample name="SessionRow: recorded, with a tag, live" className={cn(PHONE, 'divide-y divide-line')}>
        <SessionRow title="Tue 10 Nov" detail="17 skills, 9 to swap" href={HERE} onPlay={() => {}} />
        <SessionRow title="Mon 9 Nov" detail="31 skills, 2 to swap" href={HERE} tag={{ label: 'Pace met', tone: 'skill' }} onPlay={() => {}} />
        <SessionRow title="Fri 6 Nov" detail="13 skills, 2 to swap. Reflections not counted" href={HERE} tag={{ label: 'Live', tone: 'quiet' }} />
      </Sample>
      <Sample name="TranscriptRow: plain, playing, to swap and open, disputed. A tap on the first or the third moves the first player below" className={PHONE}>
        <TranscriptRow sentence={SENTENCES[0]} onToggle={() => player.current?.seek(SENTENCES[0].startSec)} />
        <TranscriptRow sentence={SENTENCES[1]} playing />
        <TranscriptRow
          sentence={SENTENCES[2]}
          open={open}
          onToggle={() => {
            setOpen(!open);
            player.current?.seek(SENTENCES[2].startSec);
          }}
          rewrite="You are building a tall tower."
          onChangeLabel={() => {}}
        />
        <TranscriptRow sentence={SENTENCES[3]} />
        <TranscriptRow sentence={SENTENCES[4]} />
      </Sample>
      <Sample name="RewriteCard" className={PHONE}>
        <RewriteCard text="You are building a tall tower." />
      </Sample>
      <Sample name="AiSummaryCard" className={PHONE}>
        <AiSummaryCard text={AI_SUMMARY} />
      </Sample>
      <Sample name="Player: with loudness and marks, then a plain track" className={cn(PHONE, 'flex flex-col gap-[12px]')}>
        <Player ref={player} src={recording} durationSec={RECORDING_SEC} peaks={PEAKS} marks={[5, 12]} />
        <Player src={recording} durationSec={RECORDING_SEC} />
      </Sample>
      <Sample name="Player, on violet, 576 wide" violet className="w-full max-w-[624px]">
        <Player src={recording} durationSec={RECORDING_SEC} peaks={PEAKS} tone="violet" />
      </Sample>
      <Sample name="ShareCard: a session, a live session" className="flex flex-wrap gap-[16px]">
        <ShareCard when="Tue 10 Nov · five minutes" headline={HEADLINE} counts={COUNTS} />
        <ShareCard when="Fri 6 Nov · live" headline="Thirteen skills, two to swap." counts={{ ...COUNTS, avoid: 2 }} live />
      </Sample>
    </Section>
  );
}

function Shell() {
  const [partner, setPartner] = useState('mia');
  const [view, setView] = useState('sessions');
  return (
    <Section title="Shell and screens">
      <Sample name="TopBar" className="border border-line">
        <TopBar
          logo={<Logo />}
          links={[
            { label: 'Pricing', href: ROUTES.pricing },
            { label: 'Jury guide', href: ROUTES.jury },
          ]}
          action={
            <Button size="md" href={ROUTES.start}>
              Start free
            </Button>
          }
        />
      </Sample>
      {/* The bar and the rail hide by screen width; here both are forced on, so each shows at any width. */}
      <Sample name="TabBar: Today, then Progress" className="flex w-full max-w-[390px] flex-col gap-[12px]">
        <TabBar current="today" className="static! block! border border-line" />
        <TabBar current="progress" className="static! block! border border-line" />
      </Sample>
      <Sample name="Rail, on Practice" className="w-fit border border-line">
        <Rail current="practice" className="static! flex! h-[560px]!" />
      </Sample>
      <Sample name="AppShell with an embedded SplitScreen (Today)">
        <div className={SCREEN}>
          <AppShell current="today" className="min-h-0 flex-1">
            <SplitScreen
              embedded
              rest="bottom"
              pattern={<Pattern kind="reps" className="lg:[--pattern-size:1440px]" />}
              bar={<Logo tone="white" className="px-[12px] lg:hidden" />}
              picture={<Portrait partner="mia" pose="body-waving" size={420} alt="Mia" className="size-[212px] lg:size-[420px]" />}
              action={
                <Button href={HERE} fullWidth>
                  Start five minutes
                </Button>
              }
              below={
                <div className="flex flex-col gap-[16px]">
                  <WeekStrip days={WEEK} />
                  <LastSessionCard when="Yesterday" headline={HEADLINE} href={HERE} />
                </div>
              }
            >
              <p className="text-label text-gray">Day 5 of 28</p>
              <h3 className="mt-[6px] text-title lg:text-title-xl">Curious without asking</h3>
            </SplitScreen>
          </AppShell>
        </div>
      </Sample>
      <Sample name="SplitScreen on its own, with a dock (the first answer)">
        <div className={SCREEN}>
          <SplitScreen
            className="min-h-0 flex-1"
            pattern={<Pattern kind="sentences" size={1440} className="max-lg:hidden" />}
            bar={
              <IconButton label="Back" href={HERE} variant="on-violet">
                <Icon name="back" />
              </IconButton>
            }
            picture={
              <>
                <Portrait partner="mia" size={380} alt="Mia" className="size-[240px] lg:size-[380px]" />
                <p className="mt-[4px] text-center text-label lg:mt-[10px] lg:text-lead">Mia stacks a red block on the tower.</p>
                <p className="mt-[4px] text-center text-title lg:mt-[10px] lg:text-title-xl">“I made a tower!”</p>
              </>
            }
            dock={
              <>
                <Chip>“Wow, good job! What is it?”</Chip>
                <ComposerSample />
              </>
            }
          />
        </div>
      </Sample>
      <Sample name="PageScreen, pushed, with a control beside the title">
        <div className={SCREEN}>
          <PageScreen
            embedded
            title="Practice"
            bar={
              <IconButton label="Back" href={HERE}>
                <Icon name="back" />
              </IconButton>
            }
            aside={<Segmented label="Practice partner" options={PARTNERS} value={partner} onChange={setPartner} />}
          >
            <div className="w-full max-w-[640px] divide-y divide-line">
              <SessionRow title="Tue 10 Nov" detail="17 skills, 9 to swap" href={HERE} />
              <SessionRow title="Mon 9 Nov" detail="31 skills, 2 to swap" href={HERE} tag={{ label: 'Pace met', tone: 'skill' }} />
            </div>
          </PageScreen>
        </div>
      </Sample>
      <Sample name="AppShell with a PageScreen: the title alone, then the page (Progress)">
        <div className={SCREEN}>
          <AppShell current="progress" className="min-h-0 flex-1">
            <PageScreen embedded title="Progress">
              <Segmented label="View" options={VIEWS} value={view} onChange={setView} fullWidth className="lg:max-w-[342px]" />
              <div className="mt-[16px] w-full max-w-[640px] divide-y divide-line">
                <SessionRow title="Tue 10 Nov" detail="17 skills, 9 to swap" href={HERE} onPlay={() => {}} />
                <SessionRow title="Mon 9 Nov" detail="31 skills, 2 to swap" href={HERE} tag={{ label: 'Pace met', tone: 'skill' }} />
              </div>
            </PageScreen>
          </AppShell>
        </div>
      </Sample>
      <Sample name="AppShell with a PageScreen and a picture: the plain page on phones, a split from 1024px (Practice)">
        <div className={SCREEN}>
          <AppShell current="practice" className="min-h-0 flex-1">
            <PageScreen
              embedded
              title="Practice"
              rest="bottom"
              pattern={<Pattern kind="reps" size={1440} />}
              picture={<Portrait partner="mia" pose="body-waving" size={420} alt="" />}
              aside={<Segmented label="Practice partner" options={PARTNERS} value={partner} onChange={setPartner} />}
            >
              <div className="flex flex-col gap-[12px] pt-[4px]">
                <Button href={HERE} fullWidth>
                  Start a round
                </Button>
                <div className="divide-y divide-line">
                  <SessionRow title="Tue 10 Nov" detail="17 skills, 9 to swap" href={HERE} />
                  <SessionRow title="Mon 9 Nov" detail="31 skills, 2 to swap" href={HERE} tag={{ label: 'Pace met', tone: 'skill' }} />
                </div>
              </div>
            </PageScreen>
          </AppShell>
        </div>
      </Sample>
    </Section>
  );
}

export function Gallery() {
  return (
    <div className="split-root">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-[64px] px-[24px] py-[40px]">
        <header className="flex flex-col gap-[8px]">
          <Logo />
          <h1 className="text-display">Kit</h1>
          <p className="text-body text-gray">Every kit and shell component with sample props. Development only.</p>
        </header>
        <Brand />
        <Pictures />
        <Actions />
        <Choices />
        <Fields />
        <Rows />
        <Numbers />
        <Sessions />
        <Shell />
      </div>
    </div>
  );
}
