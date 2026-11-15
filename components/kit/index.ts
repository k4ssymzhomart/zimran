/**
 * The Split kit in one import: `import { Button, Rings, type RingStat } from '@/components/kit'`.
 * Components are layout and look only; every word, number and picture comes in through props.
 */

// Helpers.
export { cn, colorMotion, focusRing, focusRingWithin } from './cn';

// Pictures.
export { ART, Art, Picture, type ArtFile, type ArtName, type ArtProps, type PictureProps } from './Art';
export {
  LEO,
  MIA,
  PARENT,
  SCENE_ART,
  portraitFile,
  type FacePose,
  type LeoBodyPose,
  type MiaBodyPose,
  type ParentName,
  type Pose,
  type SceneArtName,
} from './art-manifest';
export { Portrait, type PortraitProps } from './Portrait';
export { Avatar, type AvatarProps } from './Avatar';
export { Logo, LogoMark, type LogoMarkProps, type LogoProps, type LogoTone } from './Logo';
export { Pattern, type PatternKind, type PatternProps, type PatternTone } from './Pattern';

// Screen shells.
export { PageScreen, SplitScreen, type PageScreenProps, type SplitScreenProps } from './Screen';

// Actions.
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export { IconButton, type IconButtonProps, type IconButtonVariant } from './IconButton';

// Choices and fields.
export { Chip, chipClasses, type ChipProps } from './Chip';
export { ChipGroup, type ChipGroupProps, type ChipOption } from './ChipGroup';
export { Option, type OptionProps } from './Option';
export { ChoiceTile, type ChoiceTileProps } from './ChoiceTile';
export { Tile, type TileProps } from './Tile';
export { Segmented, type SegmentedOption, type SegmentedProps } from './Segmented';
export { Toggle, type ToggleProps } from './Toggle';
export { TextField, type TextFieldProps } from './TextField';
export { Composer, type ComposerProps, type MicState } from './Composer';
export { CheckIn, type CheckInProps } from './CheckIn';

// Small pieces.
export { Tag, type TagProps, type TagTone } from './Tag';
export { Divider, type DividerProps } from './Divider';
export { QuizProgress, type QuizProgressProps } from './QuizProgress';
export { Sheet, type SheetAction, type SheetProps } from './Sheet';

// Rows.
export { RowChevron, SettingRow, type SettingRowProps } from './SettingRow';
export { SettingsSection, type SettingsSectionProps } from './SettingsSection';
export { PlanRow, type PlanRowProps } from './PlanRow';
export { PatternRow, type PatternRowProps } from './PatternRow';
export { SessionRow, type SessionRowProps } from './SessionRow';
export { TranscriptRow, type TranscriptRowProps } from './TranscriptRow';

// Numbers and time.
export { Ring, Rings, type RingProps, type RingStat, type RingTone, type RingsProps } from './Rings';
export { NowAndGoal, type NowAndGoalProps, type PaceValues } from './NowAndGoal';
export { WeekStrip, type WeekDay, type WeekStripProps } from './WeekStrip';
export { MonthCalendar, monthLabel, type MonthCalendarProps } from './MonthCalendar';
export { SummaryCard, type SummaryCardProps, type SummaryFact } from './SummaryCard';

// Session cards.
export { LastSessionCard, type LastSessionCardProps } from './LastSessionCard';
export { RewriteCard, type RewriteCardProps } from './RewriteCard';
export { AiSummaryCard, type AiSummaryCardProps } from './AiSummaryCard';
export { Player, type PlayerHandle, type PlayerProps } from './Player';
export { ShareCard, type ShareCardProps } from './ShareCard';
