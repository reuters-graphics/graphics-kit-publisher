import { utils } from '@reuters-graphics/graphics-bin';
import picocolors from 'picocolors';

import type { Archive } from './archive';
import { PKG } from '../pkg';
import { PackageConfigError } from '../exceptions/errors';
import { groupMultiselect } from '../prompts/groupMultiselect';

/**
 * Choosing which archives to upload.
 *
 * Archives are self-contained, so skipping one is safe: it keeps its own
 * complete copy of everything on the server and goes on serving while others are
 * replaced. That's what makes it worth asking — a project that has accreted nine
 * embeds over a fortnight can re-upload the one that changed instead of
 * re-processing all nine at 2–5 minutes each.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */

/**
 * Longest an archive label gets before it's truncated in the prompt.
 *
 * Roomy enough for the `media-` prefix on top of what a locale and slug
 * normally need — archives are named the same way everywhere, so the prompt
 * shows the full ID rather than a shorter display form.
 */
const MAX_LABEL_LENGTH = 36;

/**
 * Shorten an archive label from the middle.
 *
 * Deliberately not from the end: sibling embeds routinely share a long prefix
 * and differ in the last token (`…-strikes-map` vs `…-strikes-chart`), so
 * trimming the tail is what would make two options look identical in a prompt
 * whose whole job is telling them apart.
 */
export const truncateMiddle = (value: string, max = MAX_LABEL_LENGTH) => {
  if (value.length <= max) return value;
  const half = (max - 1) / 2;
  return `${value.slice(0, Math.ceil(half))}…${value.slice(-Math.floor(half))}`;
};

/**
 * How an archive is labelled in the prompt: its ID, as it appears everywhere
 * else — in `--archives`, in logs, in `package.json` and on the server. Only
 * shortened when it's too long for the line, and only visually.
 */
export const archiveLabel = (archiveId: string) => truncateMiddle(archiveId);

/** Whether this archive exists on the server already. */
const archiveStatus = (archiveId: string) =>
  PKG.archive(archiveId).uploaded ? 'update' : 'new';

/**
 * Resolve requested archive IDs, e.g. from `--archives`.
 *
 * IDs only — the same `media-{locale}-{slug}` an archive is called in the
 * prompt, the logs and `package.json`. There's deliberately no shorter alias:
 * one name for a thing is easier to remember than two.
 */
export const resolveArchiveIds = (requested: string[], archives: Archive[]) => {
  const ids = archives.map((archive) => archive.id);
  const resolved: string[] = [];

  for (const request of requested) {
    const slug = request.trim();
    if (!slug) continue;
    const match = ids.find((id) => id === slug);
    if (!match)
      throw new PackageConfigError(
        `"${slug}" doesn't match an archive in this project.`,
        {
          code: 'UNKNOWN_ARCHIVE',
          hint: `Available archives: ${ids.join(', ')}.`,
          context: { requested: slug, available: ids },
        }
      );
    if (!resolved.includes(match)) resolved.push(match);
  }

  return resolved;
};

/**
 * The prompt's options, grouped so it's clear what each choice publishes: the
 * public archive is the page on reuters.com, the rest are embeds.
 */
const groupedOptions = (archives: Archive[]) => {
  const options: Record<
    string,
    { value: string; label: string; hint: string }[]
  > = {};

  for (const archive of archives) {
    const group = archive.type === 'public' ? 'reuters.com' : 'embeds';
    options[group] ??= [];
    options[group].push({
      value: archive.id,
      label: archiveLabel(archive.id),
      hint: archiveStatus(archive.id),
    });
  }

  return options;
};

interface SelectOptions {
  /** Archive IDs, e.g. from `--archives`. */
  requested?: string[];
  archives: Archive[];
}

/**
 * Which archives this run should upload.
 *
 * An explicit list wins; otherwise CI uploads everything, as it always has, and
 * a person is asked.
 */
export const selectArchives = async ({
  requested,
  archives,
}: SelectOptions): Promise<Archive[]> => {
  if (requested?.length) {
    const ids = resolveArchiveIds(requested, archives);
    return archives.filter((archive) => ids.includes(archive.id));
  }

  if (utils.environment.isCiEnvironment() || archives.length < 2)
    return archives;

  const selected = await groupMultiselect({
    message: `Which archives do you want to upload? ${picocolors.dim('(space to toggle)')}`,
    options: groupedOptions(archives),
    // Everything, so pressing enter does what running this command has always
    // done.
    initialValues: archives.map((archive) => archive.id),
    required: false,
  });

  return archives.filter((archive) => selected.includes(archive.id));
};
