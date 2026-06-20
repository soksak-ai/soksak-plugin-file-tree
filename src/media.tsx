// The media viewer — images, PDFs, video, audio. Read through app.fs.readBinary into a data URL,
// read-only. Code and text belong to an editor plugin; this takes media by exact extension.
import { useEffect, useState } from "react";
import { t as translate } from "./i18n";
import type { FileViewerContext, PluginApi } from "./host";

export type MediaKind = "image" | "pdf" | "video" | "audio";

export function MediaViewer({
  app,
  ctx,
  kind,
}: {
  app: PluginApi;
  ctx: FileViewerContext;
  kind: MediaKind;
}) {
  const lang = app.locale();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    const read = app.fs?.readBinary;
    if (!read) {
      setError("no permission to read files");
      return;
    }
    read(ctx.path)
      .then((d) => {
        if (!cancelled) setUrl(`data:${d.mime};base64,${d.base64}`);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [app, ctx.path]);

  if (error) {
    return (
      <div className="sk-fmedia">
        <span className="sk-fmedia-msg">
          {translate(kind === "image" ? "imgFail" : "binFail", lang)} — {error}
        </span>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="sk-fmedia">
        <span className="sk-fmedia-msg">{translate("loading", lang)}</span>
      </div>
    );
  }
  if (kind === "image") {
    return (
      <div className="sk-fmedia">
        <img className="sk-fmedia-img" src={url} alt="" />
      </div>
    );
  }
  if (kind === "pdf") {
    return (
      <div className="sk-fmedia">
        <embed className="sk-fmedia-embed" src={url} type="application/pdf" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="sk-fmedia">
        <video className="sk-fmedia-video" src={url} controls />
      </div>
    );
  }
  return (
    <div className="sk-fmedia">
      <audio src={url} controls />
    </div>
  );
}
