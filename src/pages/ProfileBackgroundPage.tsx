import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Image, Smile, Pen, Eraser, Undo2, Trash2, Eye, EyeOff, Bell, History, Users, Crown, Settings, ChevronRight, Camera, Palette, LogOut, Square, Circle, RectangleHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

type FrameShape = "rectangle" | "circle" | "oval";

type DrawingPoint = {
  x: number;
  y: number;
};

type DrawingPath = {
  color: string;
  width: number;
  points: DrawingPoint[];
};

type PlacedElement = {
  id: string;
  type: "emoji" | "image";
  content: string;
  x: number;
  y: number;
  size: number; // used for emoji
  width: number; // used for image
  height: number; // used for image
  shape?: FrameShape;
};

type BackgroundEditorState = {
  version: number;
  canvasWidth: number;
  canvasHeight: number;
  elements: PlacedElement[];
  drawingPaths: DrawingPath[];
};

type ParsedElement = {
  id: string;
  type: "emoji" | "image";
  content: string;
  x?: number;
  y?: number;
  size?: number;
  width?: number;
  height?: number;
  shape?: unknown;
};

type ParsedDrawingPath = {
  color: string;
  width: number;
  points: unknown[];
};

type PenStyle = {
  name: string;
  color: string;
  width: number;
  emoji: string;
};

const PEN_STYLES: PenStyle[] = [
  { name: "기본", color: "#000000", width: 3, emoji: "✏️" },
  { name: "굵은", color: "#000000", width: 8, emoji: "🖊️" },
  { name: "빨강", color: "#ef4444", width: 4, emoji: "🔴" },
  { name: "파랑", color: "#3b82f6", width: 4, emoji: "🔵" },
  { name: "초록", color: "#22c55e", width: 4, emoji: "🟢" },
  { name: "노랑", color: "#eab308", width: 4, emoji: "🟡" },
  { name: "보라", color: "#a855f7", width: 4, emoji: "🟣" },
  { name: "형광", color: "#f97316", width: 6, emoji: "🟠" },
];

const EMOJI_LIST = [
  "😊", "😂", "🥰", "😍", "🤩", "😎", "🥳", "😇",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "⭐", "🌟", "✨", "💫", "🔥", "🌈", "☀️", "🌙",
  "🌸", "🌺", "🌻", "🌹", "🌷", "💐", "🍀", "🌿",
  "🦋", "🐝", "🐞", "🐱", "🐶", "🐻", "🦊", "🐰",
  "✈️", "🚗", "🗺️", "🏔️", "🏖️", "🗼", "🎡", "🌍",
  "🎵", "🎶", "🎸", "🎹", "🎤", "🎧", "🎬", "📷",
  "🎂", "🍰", "🧁", "🍩", "🍦", "☕", "🍕", "🍔",
];

const FRAME_SHAPES: { value: FrameShape; label: string; icon: typeof Square }[] = [
  { value: "rectangle", label: "네모", icon: Square },
  { value: "circle", label: "원형", icon: Circle },
  { value: "oval", label: "타원", icon: RectangleHorizontal },
];

const EDITOR_STATE_VERSION = 1;

const getEditorStatePath = (userId: string) => `${userId}/background-editor-state.json`;

const getViewportCanvasSize = () => {
  if (typeof window === "undefined") {
    return { w: 800, h: 1200 };
  }

  const vw = Math.max(window.innerWidth, 320);
  const vh = Math.max(window.innerHeight, 568);
  const baseW = 800;

  return { w: baseW, h: Math.round(baseW * (vh / vw)) };
};

const isFrameShape = (value: unknown): value is FrameShape =>
  value === "rectangle" || value === "circle" || value === "oval";

const getStateBounds = (state: BackgroundEditorState) => {
  const maxElementX = state.elements.reduce((max, el) => Math.max(max, el.x + Math.max(el.width || el.size, 40)), 0);
  const maxElementY = state.elements.reduce((max, el) => Math.max(max, el.y + Math.max(el.height || el.size, 40)), 0);
  const maxPointX = state.drawingPaths.reduce(
    (max, path) => Math.max(max, ...path.points.map((point) => point.x)),
    0,
  );
  const maxPointY = state.drawingPaths.reduce(
    (max, path) => Math.max(max, ...path.points.map((point) => point.y)),
    0,
  );

  return {
    width: Math.max(state.canvasWidth || 0, maxElementX, maxPointX, 1),
    height: Math.max(state.canvasHeight || 0, maxElementY, maxPointY, 1),
  };
};

const normalizeEditorState = (
  state: BackgroundEditorState,
  targetWidth: number,
  targetHeight: number,
): BackgroundEditorState => {
  const bounds = getStateBounds(state);
  const scaleX = targetWidth / bounds.width;
  const scaleY = targetHeight / bounds.height;
  const uniformScale = Math.min(scaleX, scaleY);

  return {
    version: state.version,
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
    elements: state.elements.map((el) => {
      const width = Math.max(40, el.width * scaleX);
      const height = Math.max(40, el.height * scaleY);
      const size = Math.max(40, el.type === "emoji" ? el.size * uniformScale : Math.max(width, height));
      const maxX = Math.max(0, targetWidth - width);
      const maxY = Math.max(0, targetHeight - height);

      return {
        ...el,
        x: Math.min(Math.max(el.x * scaleX, 0), maxX),
        y: Math.min(Math.max(el.y * scaleY, 0), maxY),
        width,
        height,
        size,
      };
    }),
    drawingPaths: state.drawingPaths.map((path) => ({
      ...path,
      width: Math.max(1, path.width * uniformScale),
      points: path.points.map((point) => ({
        x: Math.min(Math.max(point.x * scaleX, 0), targetWidth),
        y: Math.min(Math.max(point.y * scaleY, 0), targetHeight),
      })),
    })),
  };
};

const parseEditorState = (raw: string): BackgroundEditorState | null => {
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      canvasWidth?: number;
      canvasHeight?: number;
      elements?: unknown;
      drawingPaths?: unknown;
    };
    if (!Array.isArray(parsed.elements) || !Array.isArray(parsed.drawingPaths)) {
      return null;
    }

    const elements = parsed.elements
      .filter((element): element is ParsedElement => {
        if (!element || typeof element !== "object") return false;
        const candidate = element as Partial<ParsedElement>;
        return (
          typeof candidate.id === "string" &&
          (candidate.type === "emoji" || candidate.type === "image") &&
          typeof candidate.content === "string"
        );
      })
      .map((element) => ({
        id: element.id,
        type: element.type,
        content: element.content,
        x: typeof element.x === "number" ? element.x : 0,
        y: typeof element.y === "number" ? element.y : 0,
        size: typeof element.size === "number" ? element.size : 40,
        width: typeof element.width === "number" ? element.width : (typeof element.size === "number" ? element.size : 40),
        height: typeof element.height === "number" ? element.height : (typeof element.size === "number" ? element.size : 40),
        shape: isFrameShape(element.shape) ? element.shape : "rectangle",
      }));

    const drawingPaths = parsed.drawingPaths
      .filter((path): path is ParsedDrawingPath => {
        if (!path || typeof path !== "object") return false;
        const candidate = path as Partial<ParsedDrawingPath>;
        return (
          typeof candidate.color === "string" &&
          typeof candidate.width === "number" &&
          Array.isArray(candidate.points)
        );
      })
      .map((path) => ({
        color: path.color,
        width: Math.max(1, path.width),
        points: path.points
          .filter((point): point is DrawingPoint => {
            if (!point || typeof point !== "object") return false;
            const candidate = point as Partial<DrawingPoint>;
            return typeof candidate.x === "number" && typeof candidate.y === "number";
          })
          .map((point) => ({ x: point.x, y: point.y })),
      }))
      .filter((path) => path.points.length > 0);

    return {
      version: typeof parsed.version === "number" ? parsed.version : EDITOR_STATE_VERSION,
      canvasWidth: typeof parsed.canvasWidth === "number" ? parsed.canvasWidth : 0,
      canvasHeight: typeof parsed.canvasHeight === "number" ? parsed.canvasHeight : 0,
      elements,
      drawingPaths,
    };
  } catch {
    return null;
  }
};

// PhotoEditorModal removed - editing happens on canvas now
const ProfileBackgroundPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();

  useEffect(() => {
    if (!premiumLoading && !isPremium) {
      toast.error("프리미엄 사용자만 이용할 수 있는 기능입니다");
      navigate("/profile");
    }
  }, [isPremium, premiumLoading, navigate]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [mode, setMode] = useState<"emoji" | "pen" | "eraser">("emoji");
  const [selectedPen, setSelectedPen] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [canvasSize, setCanvasSize] = useState(getViewportCanvasSize);
  const [bgLoaded, setBgLoaded] = useState(false);

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [cornerDrag, setCornerDrag] = useState<{ id: string; corner: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      setCanvasSize(getViewportCanvasSize());
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const CANVAS_W = canvasSize.w;
  const CANVAS_H = canvasSize.h;

  useEffect(() => {
    if (bgLoaded || !user || !CANVAS_W || !CANVAS_H) return;
    const loadExisting = async () => {
      const statePath = getEditorStatePath(user.id);
      const { data: stateFile, error: stateError } = await supabase.storage
        .from("profile-photos")
        .download(statePath);

      if (!stateError && stateFile) {
        const parsedState = parseEditorState(await stateFile.text());
        if (parsedState) {
          const normalizedState = normalizeEditorState(parsedState, CANVAS_W, CANVAS_H);
          bgImageRef.current = null;
          setElements(normalizedState.elements);
          setDrawingPaths(normalizedState.drawingPaths);
          setBgLoaded(true);
          return;
        }
      }

      const { data } = await supabase
        .from("profiles")
        .select("background_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.background_url) {
        bgImageRef.current = null;
        setBgLoaded(true);
        return;
      }
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { bgImageRef.current = img; setBgLoaded(true); };
      img.onerror = () => setBgLoaded(true);
      img.src = data.background_url;
    };
    loadExisting();
  }, [user, CANVAS_W, CANVAS_H, bgLoaded]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (bgImageRef.current) ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_W, CANVAS_H);
    for (const path of drawingPaths) {
      if (path.points.length < 2) continue;
      ctx.strokeStyle = path.color === "eraser" ? "#f8f9fa" : path.color;
      ctx.beginPath();
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
      ctx.stroke();
    }
    if (currentPath.length > 1) {
      ctx.strokeStyle = mode === "eraser" ? "#f8f9fa" : PEN_STYLES[selectedPen].color;
      ctx.lineWidth = mode === "eraser" ? 20 : PEN_STYLES[selectedPen].width;
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
      ctx.stroke();
    }
  }, [drawingPaths, currentPath, selectedPen, bgLoaded, mode]);

  useEffect(() => {
    redrawCanvas();
    requestAnimationFrame(() => {
      const src = canvasRef.current;
      const prev = previewCanvasRef.current;
      if (src && prev) {
        prev.width = CANVAS_W;
        prev.height = CANVAS_H;
        const ctx = prev.getContext("2d");
        if (ctx) ctx.drawImage(src, 0, 0);
      }
    });
  }, [redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const getPointerClientCoords = (
    e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  ) => {
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
    }

    return { x: e.clientX, y: e.clientY };
  };

  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Deselect element when tapping empty canvas area
    setSelectedElement(null);
    if (mode !== "pen" && mode !== "eraser") return;
    e.preventDefault();
    setIsDrawing(true);
    setCurrentPath([getCanvasCoords(e)]);
  };

  const handleCanvasMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || (mode !== "pen" && mode !== "eraser")) return;
    e.preventDefault();
    setCurrentPath((prev) => [...prev, getCanvasCoords(e)]);
  };

  const handleCanvasUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setDrawingPaths((prev) => [...prev, {
        color: mode === "eraser" ? "eraser" : PEN_STYLES[selectedPen].color,
        width: mode === "eraser" ? 20 : PEN_STYLES[selectedPen].width,
        points: currentPath,
      }]);
    }
    setCurrentPath([]);
  };

  const addEmoji = (emoji: string) => {
    setElements((prev) => [...prev, {
      id: crypto.randomUUID(), type: "emoji", content: emoji,
      x: CANVAS_W / 2 - 20, y: CANVAS_H / 2 - 20, size: 40, width: 40, height: 40,
    }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const w = 200;
      const h = 150;
      setElements((prev) => [...prev, {
        id: crypto.randomUUID(), type: "image", content: dataUrl,
        x: CANVAS_W / 2 - w / 2, y: CANVAS_H / 2 - h / 2,
        size: Math.max(w, h), width: w, height: h, shape: "rectangle" as FrameShape,
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const changeSelectedShape = (shape: FrameShape) => {
    if (!selectedElement) return;
    setElements((prev) => prev.map((el) =>
      el.id === selectedElement ? { ...el, shape } : el
    ));
  };

  const handleCornerDown = (id: string, corner: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    const { x: clientX, y: clientY } = getPointerClientCoords(e);
    setCornerDrag({ id, corner, startX: clientX, startY: clientY, origW: el.width, origH: el.height, origX: el.x, origY: el.y });
    setSelectedElement(id);
    setDragging(null);
  };

  const handleElementMouseDown = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((element) => element.id === id);
    if (!el) return;

    setSelectedElement(id);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const { x: clientX, y: clientY } = getPointerClientCoords(e);
    setDragging(id);
    setCornerDrag(null);
    setDragOffset({
      x: clientX - (el.x / scaleX + rect.left),
      y: clientY - (el.y / scaleY + rect.top),
    });
  };

  const handleContainerMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (cornerDrag) {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const { x: clientX, y: clientY } = getPointerClientCoords(e);
      const dx = (clientX - cornerDrag.startX) * scaleX;
      const dy = (clientY - cornerDrag.startY) * scaleY;
      const c = cornerDrag.corner;
      let newW = cornerDrag.origW;
      let newH = cornerDrag.origH;
      let newX = cornerDrag.origX;
      let newY = cornerDrag.origY;
      if (c.includes("r")) newW = Math.max(40, cornerDrag.origW + dx);
      if (c.includes("l")) { newW = Math.max(40, cornerDrag.origW - dx); newX = cornerDrag.origX + dx; }
      if (c.includes("b")) newH = Math.max(40, cornerDrag.origH + dy);
      if (c.includes("t")) { newH = Math.max(40, cornerDrag.origH - dy); newY = cornerDrag.origY + dy; }
      setElements((prev) => prev.map((el) => el.id === cornerDrag.id ? { ...el, width: newW, height: newH, size: Math.max(newW, newH), x: newX, y: newY } : el));
    } else if (dragging) {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const { x: clientX, y: clientY } = getPointerClientCoords(e);
      const newX = (clientX - dragOffset.x - rect.left) * scaleX;
      const newY = (clientY - dragOffset.y - rect.top) * scaleY;
      setElements((prev) => prev.map((el) => el.id === dragging ? { ...el, x: newX, y: newY } : el));
    }
  }, [CANVAS_H, CANVAS_W, cornerDrag, dragOffset.x, dragOffset.y, dragging]);

  const handleContainerMouseUp = useCallback(() => {
    setDragging(null);
    setCornerDrag(null);
  }, []);

  useEffect(() => {
    if (!dragging && !cornerDrag) return;

    const handleMove = (event: MouseEvent | TouchEvent) => handleContainerMouseMove(event);

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleContainerMouseUp);
    window.addEventListener("touchend", handleContainerMouseUp);
    window.addEventListener("touchcancel", handleContainerMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleContainerMouseUp);
      window.removeEventListener("touchend", handleContainerMouseUp);
      window.removeEventListener("touchcancel", handleContainerMouseUp);
    };
  }, [cornerDrag, dragging, handleContainerMouseMove, handleContainerMouseUp]);

  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedElement((prev) => (prev === id ? null : prev));
  };

  const undoDrawing = () => { setDrawingPaths((prev) => prev.slice(0, -1)); };

  const clearAll = () => { setElements([]); setDrawingPaths([]); setCurrentPath([]); setSelectedElement(null); };

  const getElementClipStyle = (el: PlacedElement): React.CSSProperties => {
    if (el.type !== "image") return {};
    switch (el.shape) {
      case "circle": return { borderRadius: "50%" };
      case "oval": return { borderRadius: "50%" };
      case "rectangle":
      default: return { borderRadius: "12px" };
    }
  };

  const saveBackground = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = CANVAS_W * 2;
      finalCanvas.height = CANVAS_H * 2;
      const ctx = finalCanvas.getContext("2d")!;
      ctx.scale(2, 2);
      const srcCanvas = canvasRef.current;
      if (srcCanvas) ctx.drawImage(srcCanvas, 0, 0, CANVAS_W, CANVAS_H);

      for (const el of elements) {
        if (el.type === "emoji") {
          ctx.font = `${el.size}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.content, el.x + el.size / 2, el.y + el.size / 2);
        } else if (el.type === "image") {
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              ctx.save();
              const w = el.width;
              const h = el.height;
              if (el.shape === "circle" || el.shape === "oval") {
                ctx.beginPath();
                ctx.ellipse(el.x + w / 2, el.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.clip();
              } else {
                // rounded rect clip
                const r = 12;
                ctx.beginPath();
                ctx.moveTo(el.x + r, el.y);
                ctx.lineTo(el.x + w - r, el.y);
                ctx.quadraticCurveTo(el.x + w, el.y, el.x + w, el.y + r);
                ctx.lineTo(el.x + w, el.y + h - r);
                ctx.quadraticCurveTo(el.x + w, el.y + h, el.x + w - r, el.y + h);
                ctx.lineTo(el.x + r, el.y + h);
                ctx.quadraticCurveTo(el.x, el.y + h, el.x, el.y + h - r);
                ctx.lineTo(el.x, el.y + r);
                ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y);
                ctx.closePath();
                ctx.clip();
              }
              ctx.drawImage(img, el.x, el.y, w, h);
              ctx.restore();
              resolve();
            };
            img.onerror = () => resolve();
            img.src = el.content;
          });
        }
      }

      const blob = await new Promise<Blob>((resolve) => {
        finalCanvas.toBlob((b) => resolve(b!), "image/png");
      });
      const filePath = `${user.id}/background.png`;
      const statePath = getEditorStatePath(user.id);
      const editorState: BackgroundEditorState = {
        version: EDITOR_STATE_VERSION,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        elements,
        drawingPaths,
      };
      const stateBlob = new Blob([JSON.stringify(editorState)], { type: "application/json" });
      const [{ error: uploadError }, { error: stateUploadError }] = await Promise.all([
        supabase.storage.from("profile-photos").upload(filePath, blob, { upsert: true, contentType: "image/png" }),
        supabase.storage.from("profile-photos").upload(statePath, stateBlob, { upsert: true, contentType: "application/json" }),
      ]);
      if (uploadError) throw uploadError;
      if (stateUploadError) throw stateUploadError;
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const backgroundUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ background_url: backgroundUrl } as any).eq("user_id", user.id);
      toast.success("배경이 저장되었습니다!");
      navigate("/profile");
    } catch (err: any) {
      toast.error("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-bold text-foreground">배경 꾸미기</h1>
        <Button variant="ghost" size="icon" onClick={saveBackground} disabled={saving}>
          <Save className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-[calc(200px+4rem+env(safe-area-inset-bottom))] lg:overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch lg:justify-center px-4 py-4 gap-4 lg:gap-8 lg:px-8 lg:py-6 lg:h-[calc(100dvh-56px-220px)]">
          {/* Editor Canvas */}
          <div className="flex flex-col items-center w-full max-w-[500px] lg:max-w-[45%] lg:flex-1 lg:h-full">
            <div
              ref={containerRef}
              className="relative w-full rounded-2xl overflow-hidden border-2 border-border shadow-lg bg-muted lg:h-full"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="w-full h-full absolute inset-0"
                onMouseDown={handleCanvasDown}
                onMouseMove={handleCanvasMove}
                onMouseUp={handleCanvasUp}
                onTouchStart={handleCanvasDown}
                onTouchMove={handleCanvasMove}
                onTouchEnd={handleCanvasUp}
                style={{ touchAction: "none" }}
              />

              {/* Placed elements overlay */}
              {elements.map((el) => {
                const isImage = el.type === "image";
                const elW = isImage ? el.width : el.size;
                const elH = isImage ? el.height : el.size;
                  return (
                  <div
                    key={el.id}
                    className="absolute cursor-grab active:cursor-grabbing group"
                    style={{
                      left: `${(el.x / CANVAS_W) * 100}%`,
                      top: `${(el.y / CANVAS_H) * 100}%`,
                      width: `${(elW / CANVAS_W) * 100}%`,
                      height: `${(elH / CANVAS_H) * 100}%`,
                      zIndex: selectedElement === el.id ? 20 : 10,
                      touchAction: "none",
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleElementMouseDown(el.id, e); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleElementMouseDown(el.id, e); }}
                  >
                    {el.type === "emoji" ? (
                      <span className="select-none block w-full h-full flex items-center justify-center" style={{ fontSize: `${(el.size / CANVAS_W) * 100 * 3}px` }}>
                        {el.content}
                      </span>
                    ) : (
                      <img
                        src={el.content}
                        alt=""
                        className="w-full h-full object-cover"
                        style={getElementClipStyle(el)}
                        draggable={false}
                      />
                    )}
                    {/* Controls - only show when selected */}
                    {selectedElement === el.id && (
                      <>
                        <div className="absolute -top-7 right-0 flex gap-1 z-30">
                          <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs shadow-sm font-bold">×</button>
                        </div>
                        {/* Corner resize handles for all elements */}
                        {["tl","tr","bl","br"].map((corner) => (
                          <div
                            key={corner}
                            className="absolute w-4 h-4 bg-primary border-2 border-primary-foreground rounded-sm shadow-md z-30"
                            style={{
                              top: corner.includes("t") ? "-6px" : undefined,
                              bottom: corner.includes("b") ? "-6px" : undefined,
                              left: corner.includes("l") ? "-6px" : undefined,
                              right: corner.includes("r") ? "-6px" : undefined,
                              cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize",
                            }}
                            onMouseDown={(e) => handleCornerDown(el.id, corner, e)}
                            onTouchStart={(e) => handleCornerDown(el.id, corner, e)}
                          />
                        ))}
                        <div className="absolute inset-0 border-2 border-primary/50 pointer-events-none rounded-sm" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Preview */}
          <div className={`${showPreview ? "flex" : "hidden"} lg:flex flex-col items-center w-full max-w-[500px] lg:max-w-[45%] lg:flex-1 lg:h-full`}>
            <p className="text-xs text-muted-foreground mb-2 font-medium">프로필 미리보기</p>
            <div className="relative w-full lg:flex-1 rounded-2xl overflow-hidden border-2 border-border bg-background shadow-md" style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}>
              <div className="absolute inset-0 z-0">
                <div className="w-full h-full relative">
                  <canvas ref={previewCanvasRef} className="w-full h-full object-cover opacity-30" />
                  {elements.map((el) => {
                    const isImage = el.type === "image";
                    const elW = isImage ? el.width : el.size;
                    const elH = isImage ? el.height : el.size;
                    return (
                      <div
                        key={`preview-${el.id}`}
                        className="absolute"
                        style={{
                          left: `${(el.x / CANVAS_W) * 100}%`,
                          top: `${(el.y / CANVAS_H) * 100}%`,
                          width: `${(elW / CANVAS_W) * 100}%`,
                          height: `${(elH / CANVAS_H) * 100}%`,
                          opacity: 0.3,
                        }}
                      >
                        {el.type === "emoji" ? (
                          <span className="block w-full h-full flex items-center justify-center" style={{ fontSize: `${(el.size / CANVAS_W) * 100 * 2}px` }}>{el.content}</span>
                        ) : (
                          <img src={el.content} alt="" className="w-full h-full object-cover" style={getElementClipStyle(el)} draggable={false} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="relative z-10 flex flex-col items-center pt-[5%] px-[5%] pb-[3%] h-full">
                <div className="w-[65%] rounded-3xl bg-muted/50 border-2 border-border/60 overflow-hidden shadow-lg relative" style={{ aspectRatio: "10/7" }}>
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-2xl lg:text-3xl">😊</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-[8%] h-[8%] text-foreground/20" />
                  </div>
                </div>
                <p className="mt-[2%] text-[0.7rem] lg:text-sm font-bold text-foreground/60 font-display">내 프로필</p>
                <p className="mt-[0.5%] text-[0.5rem] lg:text-[0.6rem] text-muted-foreground/60">user@email.com</p>
                <div className="mt-[1.5%] flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/50 bg-card/30">
                  <Palette className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-foreground/40" />
                  <span className="text-[0.45rem] lg:text-[0.55rem] text-foreground/40">배경 수정하기</span>
                </div>
                <div className="mt-[3%] w-full space-y-[1.5%] flex-1 overflow-hidden">
                  {[
                    { icon: Bell, label: "알림 설정", desc: "푸시 알림 관리" },
                    { icon: History, label: "여행 기록", desc: "완료된 여행 계획 보관" },
                    { icon: Users, label: "그룹 관리", desc: "멤버 초대 및 관리" },
                    { icon: Crown, label: "프리미엄", desc: "용량 확장, 커스텀 도메인" },
                    { icon: Settings, label: "앱 설정", desc: "테마, 언어 등" },
                  ].map((item) => (
                    <div key={item.label} className="w-full rounded-xl bg-card/50 border border-border/40 flex items-center px-[3%] py-[1.5%]">
                      <div className="p-[3%] rounded-lg bg-muted/60 mr-[2.5%] flex-shrink-0">
                        <item.icon className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-foreground/50" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[0.5rem] lg:text-[0.6rem] font-medium text-foreground/50 leading-tight">{item.label}</span>
                        <span className="text-[0.4rem] lg:text-[0.5rem] text-muted-foreground/40 leading-tight">{item.desc}</span>
                      </div>
                      <ChevronRight className="w-2 h-2 lg:w-3 lg:h-3 text-muted-foreground/30 flex-shrink-0" />
                    </div>
                  ))}
                </div>
                <div className="mt-[2%] w-full flex items-center justify-center gap-1 py-[1%]">
                  <LogOut className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-destructive/40" />
                  <span className="text-[0.5rem] lg:text-[0.55rem] text-destructive/40">로그아웃</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex gap-1.5">
            <Button size="sm" variant={mode === "emoji" ? "default" : "outline"} onClick={() => setMode("emoji")} className="gap-1 text-xs h-8 px-2">
              <Smile className="w-3.5 h-3.5" /> 이모지
            </Button>
            <Button size="sm" variant={mode === "pen" ? "default" : "outline"} onClick={() => setMode("pen")} className="gap-1 text-xs h-8 px-2">
              <Pen className="w-3.5 h-3.5" /> 그리기
            </Button>
            <Button size="sm" variant={mode === "eraser" ? "default" : "outline"} onClick={() => setMode("eraser")} className="gap-1 text-xs h-8 px-2">
              <Eraser className="w-3.5 h-3.5" /> 지우개
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-xs h-8 px-2">
              <Image className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={undoDrawing} className="text-xs h-8 px-2">
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-destructive h-8 px-2">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="lg:hidden gap-1 text-xs h-8 px-2">
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

        <div className="px-3 py-2 max-h-[120px] overflow-y-auto">
          {mode === "emoji" ? (
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} onClick={() => addEmoji(emoji)} className="w-9 h-9 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors">
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {PEN_STYLES.map((pen, i) => (
                <button
                  key={pen.name}
                  onClick={() => setSelectedPen(i)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors ${
                    selectedPen === i ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-base">{pen.emoji}</span>
                  <span className="text-[9px] text-muted-foreground">{pen.name}</span>
                  <div className="w-5 rounded-full" style={{ height: pen.width, backgroundColor: pen.color }} />
                </button>
              ))}
            </div>
          )}
          {/* Frame shape selector - only visible when an image element is selected */}
          {(() => {
            const sel = selectedElement ? elements.find((el) => el.id === selectedElement) : null;
            if (!sel || sel.type !== "image") return null;
            return (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium">틀:</span>
                {FRAME_SHAPES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => changeSelectedShape(f.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
                      sel.shape === f.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <f.icon className="w-3.5 h-3.5" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ProfileBackgroundPage;
