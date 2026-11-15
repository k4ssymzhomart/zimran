/**
 * The two result screens of the first visit come from here, so the flow has one place to switch.
 * Developer B builds the final versions in components/round (RoundOneResult, BeforeAfter) with the props in
 * ./types.ts. Until they land, the first visit uses the ones in this folder.
 */
export { RoundOneResult } from './RoundOneResult';
export { BeforeAfter } from './BeforeAfter';
