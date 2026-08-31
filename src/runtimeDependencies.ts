interface RuntimePluginReference {
  id: string;
  version: string;
}

export function runtimePluginReferences(manifest: unknown): RuntimePluginReference[] {
  const plugins = (manifest as {
    runtimeDependencies?: { plugins?: unknown };
  } | null)?.runtimeDependencies?.plugins;
  if (!Array.isArray(plugins)) return [];
  return plugins.filter((value): value is RuntimePluginReference => {
    if (!value || typeof value !== "object") return false;
    const reference = value as Partial<RuntimePluginReference>;
    return typeof reference.id === "string" && typeof reference.version === "string";
  });
}
