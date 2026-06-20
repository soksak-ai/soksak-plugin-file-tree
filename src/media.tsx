// 미디어 뷰어 — 이미지/PDF/영상/오디오. app.fs.readBinary → data URL 렌더(읽기 전용 — dirty 없음).
// 코드/텍스트는 에디터 플러그인 몫(이 플러그인은 정확 확장자로 미디어만 가져간다).
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
      setError("fs:read 권한 없음");
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
