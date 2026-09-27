import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../context/i18n';
import { fetchChatMediaObjectUrl } from '../../utils/chatMediaAuthBlob';

type Props = {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  mine: boolean;
  filename?: string | null;
  onOpen?: () => void;
};

export const SupportChatMessageMedia: React.FC<Props> = ({ url, kind, mine, filename, onOpen }) => {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const isVisual = kind === 'image' || kind === 'video';

  useEffect(() => {
    let objectUrl: string | null = null;
    setFailed(false);
    setSrc(null);
    void fetchChatMediaObjectUrl(url)
      .then((u) => {
        objectUrl = u;
        setSrc(u);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <p className={`text-xs ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {t('supportChat.mediaFailed')}
      </p>
    );
  }

  if (!src) {
    return (
      <p className={`text-xs ${mine ? 'text-white/70' : 'text-gray-400'}`}>{t('common.loading')}</p>
    );
  }

  if (kind === 'audio') {
    return <audio controls src={src} className="mt-1 max-w-full min-w-[12rem]" preload="metadata" />;
  }

  const visualFrameClass =
    'relative mt-1 w-full min-w-[12rem] max-w-[17rem] aspect-[4/3] max-h-48 overflow-hidden rounded-lg bg-black/10 dark:bg-black/25';

  if (kind === 'image') {
    const img = (
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
    );
    const frame = <div className={visualFrameClass}>{img}</div>;
    if (onOpen) {
      return (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full max-w-[17rem] cursor-zoom-in border-0 bg-transparent p-0 text-start"
          aria-label={t('chatMediaOpenAria')}
        >
          {frame}
        </button>
      );
    }
    return frame;
  }

  if (kind === 'video') {
    const inner = (
      <div className={visualFrameClass}>
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
            <Icon name="play" className="h-5 w-5 ms-0.5" />
          </span>
        </span>
      </div>
    );
    if (onOpen) {
      return (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full max-w-[17rem] cursor-pointer border-0 bg-transparent p-0"
          aria-label={t('chatMediaOpenAria')}
        >
          {inner}
        </button>
      );
    }
    return inner;
  }

  return (
    <a
      href={src}
      download={filename || 'attachment'}
      className={`mt-1 inline-block text-sm underline ${mine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}
    >
      {filename || t('supportChat.downloadAttachment')}
    </a>
  );
};
