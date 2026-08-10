import { commonDict } from './common';
import { marketingFeaturesDict } from './marketingFeatures';
import { marketingPagesDict } from './marketingPages';
import { authDict } from './auth';
import { dashboardDict } from './dashboard';
import { projectsDict } from './projects';
import { tasksDict } from './tasks';
import { calendarDict } from './calendar';
import { notesDict } from './notes';
import { teamDict } from './team';
import { settingsDict } from './settings';
import { billingDict } from './billing';
import { meetingsDict } from './meetings';
import { appLayoutDict } from './appLayout';
import { landingDict } from './landing';
import { tourDict } from './tour';

type NamespaceDict = Record<string, string>;
type LocaleDict = Record<string, NamespaceDict>;

/**
 * Aggregates every per-namespace dictionary into one lookup table keyed by
 * locale then namespace. Add a new namespace here after creating its file —
 * this is the only file that imports every dict module, so keep additions
 * append-only to avoid merge conflicts when several namespaces land at once.
 */
export const dictionaries: Record<'id' | 'en', LocaleDict> = {
  id: {
    common: commonDict.id,
    marketingFeatures: marketingFeaturesDict.id,
    marketingPages: marketingPagesDict.id,
    auth: authDict.id,
    dashboard: dashboardDict.id,
    projects: projectsDict.id,
    tasks: tasksDict.id,
    calendar: calendarDict.id,
    notes: notesDict.id,
    team: teamDict.id,
    settings: settingsDict.id,
    billing: billingDict.id,
    meetings: meetingsDict.id,
    appLayout: appLayoutDict.id,
    landing: landingDict.id,
    tour: tourDict.id,
  },
  en: {
    common: commonDict.en,
    marketingFeatures: marketingFeaturesDict.en,
    marketingPages: marketingPagesDict.en,
    auth: authDict.en,
    dashboard: dashboardDict.en,
    projects: projectsDict.en,
    tasks: tasksDict.en,
    calendar: calendarDict.en,
    notes: notesDict.en,
    team: teamDict.en,
    settings: settingsDict.en,
    billing: billingDict.en,
    meetings: meetingsDict.en,
    appLayout: appLayoutDict.en,
    landing: landingDict.en,
    tour: tourDict.en,
  },
};
