"use server";
import { fetchRepository } from "@/lib/fetch-github";
import { fetchNpmPackage, type NpmPackageStatsData } from "@/lib/fetch-npm";
import React from "react";
import {
  FiDownload,
  FiFileText,
  FiPackage,
  FiStar,
  FiTag,
} from "react-icons/fi";
import { compareBuild } from "semver";

import { twMerge } from "tailwind-merge";
import { SvgCurveGraph } from "../svg-curve-graph";
import { formatStatNumber } from "@/lib/utils";
import { EmbedFrame, EmbedFrameProps } from "../embed-frame";
import { GithubAvatar } from "@/components/npm-package/github-avatar";

export type NpmPackageProps = Omit<EmbedFrameProps, "Icon" | "children"> & {
  pkg: string;
  repo: string;
  version: string;
  accent?: string;
  versionRollout?: number;
  versionRolloutSort?: "count" | "semver";
  children?: React.ReactNode;
};

export const NpmPackage: React.FC<NpmPackageProps> = async ({
  pkg,
  repo,
  version,
  accent = "text-blue-500",
  className,
  children,
  versionRollout = 5,
  versionRolloutSort = "count",
  ...props
}) => {
  try {
    const [npm, github] = await Promise.all([
      fetchNpmPackage(pkg),
      fetchRepository(repo),
    ]);
    return (
      <EmbedFrame className={twMerge("relative", className)} {...props}>
        <data aria-hidden className="hidden">
          NPM updated at: {npm.updatedAt.toISOString()}
          <br />
          GitHub updated at: {github.updatedAt.toISOString()}
        </data>
        <figure className="not-prose my-2 max-w-[433px] max-h-[600px]">
          <div className="px-4">
            <header
              className="mb-2 flex flex-wrap justify-between gap-2"
              style={{ alignItems: "last baseline" }}
            >
              <a href={github.url}>
                <h3 className="mt-0 flex items-center text-xl font-semibold text-gray-900 dark:text-gray-100">
                  <GithubAvatar github={github} repo={repo} />
                  {repo}
                </h3>
              </a>
              <div className="flex gap-6 text-sm text-gray-500">
                <dl className="flex items-center gap-1" title="Stars">
                  <FiStar />
                  <dd>{formatStatNumber(github.stars)}</dd>
                </dl>
                <dl
                  className="flex items-center gap-1"
                  title="NPM downloads (all time)"
                >
                  <FiDownload />
                  <dd>{formatStatNumber(npm.allTime)}</dd>
                </dl>
                {version && (
                  <dl
                    className="flex items-center gap-1"
                    title="Latest version"
                  >
                    <FiTag />
                    <span>{version}</span>
                  </dl>
                )}
                {github.license && (
                  <dl className="flex items-center gap-1" title="License">
                    <FiFileText />
                    <dd>{github.license.split(" ")[0]}</dd>
                  </dl>
                )}
              </div>
            </header>
            <p className="my-4">{github.description}</p>
            {children}
            <pre className="my-4 rounded border bg-gray-50/50 !p-2 text-sm dark:border-gray-800 dark:bg-gray-950 dark:shadow-inner">
              <details className="text-gray-500">
                <summary>
                  <PackageManager
                    npm={npm}
                    accent={accent}
                    packageManager="pnpm"
                  />
                </summary>
                {(["yarn", "npm"] as const).map((pm) => (
                  <div key={pm}>
                    <PackageManager
                      className="ml-3"
                      npm={npm}
                      accent={accent}
                      packageManager={pm}
                    />
                  </div>
                ))}
              </details>
            </pre>
          </div>
          {versionRollout && (
            <VersionRollout
              versions={npm.versions}
              accent={accent}
              limit={versionRollout}
              latestVersion={version}
              sort={versionRolloutSort}
            />
          )}
          <SvgCurveGraph
            data={npm.last30Days ?? []}
            className={accent}
            height={120}
            lastDate={npm.lastDate}
          />
        </figure>
      </EmbedFrame>
    );
  } catch (error) {
    console.error(error);
    return (
      <EmbedFrame className={className} isError {...props}>
        <div className="not-prose">
          <p className="font-medium">Error displaying package {pkg}</p>
          <code className="text-sm text-red-500">{String(error)}</code>
        </div>
      </EmbedFrame>
    );
  }
};

// --

type PackageManagerProps = {
  npm: Pick<NpmPackageStatsData, "url" | "packageName">;
  className?: string;
  accent: string;
  packageManager: "npm" | "yarn" | "pnpm";
};

const PackageManager: React.FC<PackageManagerProps> = ({
  className,
  npm,
  accent,
  packageManager,
}) => (
  <>
    <span className={twMerge(className, "select-none text-red-500/75")}>
      ${" "}
    </span>
    {packageManager} {packageManager === "npm" ? "install" : "add"}{" "}
    <a href={npm.url} className={accent}>
      {npm.packageName}
    </a>
  </>
);

type VersionRolloutProps = {
  versions: Record<string, number>;
  accent: string;
  limit: number;
  sort: "count" | "semver";
  latestVersion?: string;
};

const sortFunctions: Record<
  VersionRolloutProps["sort"],
  (
    a: [version: string, count: number],
    b: [version: string, count: number],
  ) => number
> = {
  count: ([, a], [, b]) => b - a,
  semver: ([a], [b]) => compareBuild(b, a),
};

const VersionRollout: React.FC<VersionRolloutProps> = ({
  versions,
  accent,
  latestVersion,
  limit,
  sort,
}) => {
  const data = Object.entries(versions)
    .slice()
    .sort(sortFunctions[sort] ?? sortFunctions["count"])
    .slice(0, limit);
  const totalCount = Object.values(versions).reduce(
    (sum, count) => sum + count,
    0,
  );
  return (
    <>
      <div
        className="px-4 mb-2 text-xs max-h-72 overflow-auto"
        id="version-rollout"
      >
        <p className="mb-1 flex text-gray-500">
          Version rollout
          <span className="ml-auto">Last week</span>
        </p>
        {data.map(([version, count]) => (
          <div key={version} className="relative flex">
            <span
              className={twMerge(
                "relative z-10 font-mono",
                version === latestVersion ? accent : undefined,
                version === latestVersion ? "font-semibold" : undefined,
              )}
            >
              {version}
            </span>
            <div
              aria-hidden
              className={twMerge(
                "absolute bottom-0 left-0 right-24 top-0 my-0.5 appearance-none rounded-sm bg-current opacity-10",
                accent,
              )}
              style={{
                maxWidth: `${(100 * count) / totalCount}%`,
              }}
            />
            <div className="ml-auto text-right tabular-nums">
              <span className={twMerge("font-semibold", accent)}>
                {formatStatNumber(count)}
              </span>{" "}
              <span className="text-gray-500">
                ({((100 * count) / totalCount).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
