/**
 * mario.ts — Konami Code Easter Egg
 *
 * Trigger: ↑ ↑ ↓ ↓ ← → ← → B A
 *
 * Integration (add to end of createMap() in map.ts):
 *   import { initMario } from './mario';
 *   ...
 *   initMario(map, placementLayersId);
 */

import L from 'leaflet';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Leaflet Map extended with the app-specific layer groups. */
interface AppMap extends L.Map {
    groups: {
        placement: L.LayerGroup;
        [key: string]: L.LayerGroup;
    };
}

type PowerupType = 'mushroom' | 'star';

interface PowerupItem {
    latlng: L.LatLng;
    marker: L.Marker;
}

interface LockedTarget {
    poly: L.Polygon;
    center: L.LatLng;
}

interface PowerupConfig {
    className: string;
    html: string;
}

// ─── Konami sequence ──────────────────────────────────────────────────────────
const KONAMI: string[] = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];

// ─── Sprite sheet layout ──────────────────────────────────────────────────────
// mario-sprite.png: 7 cells × 1 row, each cell 128×120 px
//   Cell 0 — step       (walk frame A)
//   Cell 1 — stand      (walk frame B)
//   Cell 2 — jump       (used in power-up jump: mid→jump→mid)
//   Cell 3 — turn-left  (shown briefly when Mario turns left)
//   Cell 4 — turn-right (shown briefly when Mario turns right)
//   Cell 5 — mid-jump   (first & last frame of power-up jump)
//   Cell 6 — throw      (held while fireball is in-flight)
const SPRITE_URL = './img/mario-sprite.png';
const CELL_W     = 128;
const CELL_H     = 120;
const DISPLAY_H  = 50; // only change this to resize Mario
const DISPLAY_W  = Math.round(CELL_W * (DISPLAY_H / CELL_H));

// Named cell indices — single source of truth
const CELL_STEP       = 0;
const CELL_STAND      = 1;
const CELL_JUMP       = 2;
const CELL_TURN_LEFT  = 3;
const CELL_TURN_RIGHT = 4;
const CELL_MID_JUMP   = 5;
const CELL_THROW      = 6;

const WALK_FPS     = 7;   // step↔stand alternation speed
const TURN_HOLD_MS = 220; // how long the turn frame is held

// ─── Movement / gameplay ──────────────────────────────────────────────────────
const MOVE_HZ          = 12;   // movement ticks per second
const MOVE_SPEED_M     = 4;    // metres per movement tick
const FIRE_RANGE_M     = 60;   // metres — fire when this close and lat-aligned
const FIREBALL_STEPS   = 22;   // animation steps for fireball travel
const FIREBALL_MS      = 420;  // total fireball travel time in ms
const MUSHROOM_CHANCE  = 0.15; // roll threshold for mushroom spawn
const MUSHROOM_LIMIT   = 1;    // max mushrooms per game
const MUSHROOM_GROW_FACTOR = 1.5;
const STAR_CHANCE      = 0.05; // roll threshold for star spawn (after mushroom miss)
const STAR_LIMIT       = 3;    // max stars per game
const INVINCIBLE_MS    = 10000;

// ─── Audio ────────────────────────────────────────────────────────────────────
const AUDIO_ITS_ME  = 'sm64_mario_its_me.wav';
const AUDIO_COIN    = 'smw_coin.wav';
const AUDIO_POWERUP = 'smw_power-up.wav';
const AUDIO_FIREBALL = 'smw_fireball.wav';
const AUDIO_END     = 'smw_course_clear.wav';
const AUDIO_BGM     = 'SMB2-Subspace.oga';
const BGM_NORMAL_RATE     = 1;
const BGM_INVINCIBLE_RATE = 1.35;
const BGM_VOLUME = 0.3; // background music
const AUDIO_VOLUME = 0.5; // coin, power-up, fireball sounds

// ─── Power-up config ─────────────────────────────────────────────────────────
const POWERUP_CONFIG: Record<PowerupType, PowerupConfig> = {
    mushroom: { className: 'mario-mushroom-wrap', html: `<div class="mario-mushroom">🍄</div>` },
    star:     { className: 'mario-star-wrap',     html: `<div class="mario-star">⭐</div>` },
};

// ─── Module-level state ───────────────────────────────────────────────────────
let marioActive = false;
let bgmAudio: HTMLAudioElement | null = null;
let hasRunOnce  = false;

// ─── Public init ──────────────────────────────────────────────────────────────
export function initMario(map: AppMap, placementLayersId: number): void {
    injectStyles();
    const seq: string[] = [];

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (marioActive) return;

        seq.push(e.key);
        if (seq.length > KONAMI.length) seq.shift();
        if (seq.join() === KONAMI.join()) unleashMario(map, placementLayersId);
    });
}

// ─── Core ─────────────────────────────────────────────────────────────────────
function unleashMario(map: AppMap, placementLayersId: number): void {
    if (hasRunOnce) { showToast('Refresh page to run again!'); return; }
    hasRunOnce  = true;
    marioActive = true;

    let mushroomsCounter = 0;
    let starsCounter     = 0;

    showToast('👨🏻 IT\'S-A ME, MARIO! 👨🏻');
    playSound(AUDIO_ITS_ME);

    const placementLayer = map.groups.placement.getLayer(placementLayersId) as L.LayerGroup;
    let polygons = collectPolygons(placementLayer);
    polygons.sort(() => Math.random() - 0.5);

    if (polygons.length === 0) {
        stopBackgroundMusic();
        playSound(AUDIO_END);
        showToast('No camps to burn!');
        marioActive = false;
        return;
    }
    setTimeout(() => startBackgroundMusic(), 2000);

    // ── Shared state ──────────────────────────────────────────────────────────
    let score       = 0;
    let isThrowing  = false; // fireball in-flight
    let isTurning   = false; // briefly true when direction flips
    let isJumping   = false; // true during power-up jump
    let isPaused    = false;
    let facingRight = true;
    let turnCell    = CELL_TURN_RIGHT;
    let walkPhase   = 0;     // 0 = step, 1 = stand
    let walkTick    = 0;
    let sizeMultiplier = 1;
    let isInvincible   = false;
    let lockedTarget: LockedTarget | null = null;
    let mushrooms: PowerupItem[] = [];
    let stars:     PowerupItem[] = [];

    // Jump animation: mid-jump → jump → mid-jump
    const jumpCells = [CELL_MID_JUMP, CELL_JUMP, CELL_MID_JUMP];
    let jumpPhase = 0;

    // ── Marker ────────────────────────────────────────────────────────────────
    const icon = L.divIcon({
        className: 'mario-icon',
        html: `<div class="mario-sprite-inner"></div>`,
        iconSize:   [DISPLAY_W, DISPLAY_H],
        iconAnchor: [DISPLAY_W / 2, DISPLAY_H],
    });
    const marioMarker = L.marker(map.getCenter(), { icon, zIndexOffset: 9999 }).addTo(map);

    // ── Score HUD ─────────────────────────────────────────────────────────────
    const scoreEl = document.createElement('div');
    scoreEl.id = 'mario-score';
    scoreEl.textContent = '🌕  0';
    document.body.appendChild(scoreEl);

    // ── Helpers ───────────────────────────────────────────────────────────────

    function getSpriteInner(): HTMLElement | null {
        return marioMarker.getElement()?.querySelector<HTMLElement>('.mario-sprite-inner') ?? null;
    }

    function getFirePosition(targetCenter: L.LatLng, marioPos: L.LatLng): L.LatLng {
        const offsetLng = FIRE_RANGE_M / (111320 * Math.cos(targetCenter.lat * Math.PI / 180));
        const side = marioPos.lng < targetCenter.lng ? -1 : 1;
        return L.latLng(targetCenter.lat, targetCenter.lng + side * offsetLng);
    }

    function updateFacing(newFacingRight: boolean): void {
        if (newFacingRight === facingRight || isTurning) return;
        facingRight = newFacingRight;
        turnCell    = facingRight ? CELL_TURN_RIGHT : CELL_TURN_LEFT;
        isTurning   = true;
        setTimeout(() => { isTurning = false; }, TURN_HOLD_MS);
    }

    function resolveLockedTarget(marioPos: L.LatLng): LockedTarget | null {
        if (lockedTarget && polygons.includes(lockedTarget.poly)) return lockedTarget;
        let minDist = Infinity;
        let resolved: LockedTarget | null = null;
        for (const poly of polygons) {
            const center = poly.getBounds().getCenter();
            const d = marioPos.distanceTo(center);
            if (d < minDist) { minDist = d; resolved = { poly, center }; }
        }
        lockedTarget = resolved;
        return resolved;
    }

    function chasePowerup(
        pos: L.LatLng,
        items: PowerupItem[],
        speed: number,
        onCollect: () => void,
    ): boolean {
        if (items.length === 0) return false;

        let nearest: PowerupItem | null = null;
        let minDist = Infinity;
        let nearestIdx = -1;

        items.forEach((item, idx) => {
            const d = pos.distanceTo(item.latlng);
            if (d < minDist) { minDist = d; nearest = item; nearestIdx = idx; }
        });
        if (!nearest) return false;

        if (minDist < 15) {
            items.splice(nearestIdx, 1);
            map.removeLayer((nearest as PowerupItem).marker);
            isPaused = true;
            startPowerUpJump(
                () => onCollect(),
                () => { isPaused = false; },
            );
            return true;
        }

        facingRight = (nearest as PowerupItem).latlng.lng >= pos.lng;
        const moveStep = Math.min(speed / minDist, 1);
        marioMarker.setLatLng(L.latLng(
            pos.lat + ((nearest as PowerupItem).latlng.lat - pos.lat) * moveStep,
            pos.lng + ((nearest as PowerupItem).latlng.lng - pos.lng) * moveStep,
        ));
        return true;
    }

    function spawnPowerup(latlng: L.LatLng, type: PowerupType): void {
        const config = POWERUP_CONFIG[type];
        const icon   = L.divIcon({ ...config, iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker(latlng, { icon, zIndexOffset: 9998 }).addTo(map);
        (type === 'mushroom' ? mushrooms : stars).push({ latlng, marker });
    }

    function growMario(): void {
        playSound(AUDIO_POWERUP);
        sizeMultiplier *= MUSHROOM_GROW_FACTOR;

        const bigW   = Math.round(DISPLAY_W * sizeMultiplier);
        const bigH   = Math.round(DISPLAY_H * sizeMultiplier);
        const smallW = Math.round(DISPLAY_W * (sizeMultiplier / MUSHROOM_GROW_FACTOR));
        const smallH = Math.round(DISPLAY_H * (sizeMultiplier / MUSHROOM_GROW_FACTOR));

        function setSize(w: number, h: number): void {
            marioMarker.setIcon(L.divIcon({
                className: 'mario-icon',
                html: `<div class="mario-sprite-inner" style="width:${w}px;height:${h}px;background-size:${7 * w}px ${h}px"></div>`,
                iconSize:   [w, h],
                iconAnchor: [w / 2, h],
            }));
            if (isInvincible) getSpriteInner()?.classList.add('mario-invincible');
        }

        const GROW_FLASH_MS = 120;
        const flashFrames: [number, number][] = [
            [bigW, bigH], [smallW, smallH], [bigW, bigH], [smallW, smallH], [bigW, bigH],
        ];
        flashFrames.forEach(([w, h], i) => setTimeout(() => setSize(w, h), i * GROW_FLASH_MS));
        setTimeout(() => showToast('🍄 SUPER MARIO 🍄'), flashFrames.length * GROW_FLASH_MS);
    }

    function activateInvincibility(): void {
        isInvincible = true;
        setBackgroundMusicPlaybackRate(BGM_INVINCIBLE_RATE);
        getSpriteInner()?.classList.add('mario-invincible');
        showToast('⭐ INVINCIBLE MARIO ⭐');

        setTimeout(() => {
            isInvincible = false;
            setBackgroundMusicPlaybackRate(BGM_NORMAL_RATE);
            getSpriteInner()?.classList.remove('mario-invincible');
        }, INVINCIBLE_MS);
    }

    function startPowerUpJump(onPeak: () => void, onDone: () => void): void {
        isJumping = true;
        jumpPhase = 0;
        const JUMP_FRAME_MS = 450;
        setTimeout(() => { jumpPhase = 1; onPeak(); },  JUMP_FRAME_MS);
        setTimeout(() => { jumpPhase = 2; },            JUMP_FRAME_MS * 2);
        setTimeout(() => { isJumping = false; jumpPhase = 0; onDone(); }, JUMP_FRAME_MS * 3);
    }

    function throwFireball(fromPos: L.LatLng, toPos: L.LatLng, poly: L.Polygon): void {
        playSound(AUDIO_FIREBALL);
        isThrowing = true;
        isPaused   = true;
        setTimeout(() => { isPaused = false; }, 100);

        const fbIcon = L.divIcon({
            className: 'mario-fireball-wrap',
            html: `<div class="mario-fireball"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9],
        });
        const fireballMarker = L.marker(fromPos, { icon: fbIcon, zIndexOffset: 10000 }).addTo(map);

        let step = 0;
        const stepInterval = FIREBALL_MS / FIREBALL_STEPS;
        const fbTimer = setInterval(() => {
            step++;
            const t   = step / FIREBALL_STEPS;
            const arc = Math.sin(t * Math.PI) * 0.00025;
            fireballMarker.setLatLng([
                fromPos.lat + (toPos.lat - fromPos.lat) * t + arc,
                fromPos.lng + (toPos.lng - fromPos.lng) * t,
            ]);
            if (step >= FIREBALL_STEPS) {
                clearInterval(fbTimer);
                map.removeLayer(fireballMarker);
                onFireballHit(toPos, poly);
            }
        }, stepInterval);
    }

    function onFireballHit(center: L.LatLng, poly: L.Polygon): void {
        spawnExplosion(center, poly);

        const roll             = Math.random();
        const canSpawnPowerup  = polygons.length > 0;

        if (canSpawnPowerup && roll < MUSHROOM_CHANCE && mushroomsCounter < MUSHROOM_LIMIT) {
            spawnPowerup(center, 'mushroom');
            mushroomsCounter++;
        } else if (canSpawnPowerup && roll < STAR_CHANCE && starsCounter < STAR_LIMIT && !isInvincible) {
            spawnPowerup(center, 'star');
            starsCounter++;
        } else {
            addScore(center);
        }

        fadeRemove(poly);
        setTimeout(() => { isThrowing = false; walkPhase = 0; walkTick = 0; }, 300);
    }

    function addScore(center: L.LatLng): void {
        score += 10;
        scoreEl.textContent = `🌕  ${score}`;
        scoreEl.classList.add('mario-score-pop');
        setTimeout(() => scoreEl.classList.remove('mario-score-pop'), 300);
        showScorePopup(center, '🌕');
        playSound(AUDIO_COIN);
    }

    // ── Explosion ─────────────────────────────────────────────────────────────
    const FIRE_COLORS = ['#ff4400', '#ff8800', '#ffcc00', '#ffffff', '#ff2200'];

    function spawnExplosion(latlng: L.LatLng, poly: L.Polygon): void {
        for (let i = 0; i < 18; i++) spawnParticle(latlng);

        const verts = (poly.getLatLngs()?.[0] ?? []) as L.LatLng[];
        const step  = Math.max(1, Math.floor(verts.length / 5));
        for (let i = 0; i < verts.length; i += step) spawnParticle(verts[i], 2);

        showExplosionRing(latlng);
    }

    function spawnParticle(origin: L.LatLng, count = 1): void {
        for (let n = 0; n < count; n++) {
            const color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
            const pIcon = L.divIcon({
                className: 'mario-particle-wrap',
                html: `<div class="mario-pixel" style="background:${color}"></div>`,
                iconSize: [6, 6], iconAnchor: [3, 3],
            });
            const particleMarker = L.marker(origin, { icon: pIcon }).addTo(map);

            let pos: { lat: number; lng: number } = { lat: origin.lat, lng: origin.lng };
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.00007 + Math.random() * 0.00012;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            let life = 0;
            const maxLife = 20;

            const particleTimer = setInterval(() => {
                if (isPaused) return;
                pos = { lat: pos.lat + vy, lng: pos.lng + vx };
                vy -= 0.000022;
                particleMarker.setLatLng([pos.lat, pos.lng]);
                if (++life >= maxLife) { clearInterval(particleTimer); map.removeLayer(particleMarker); }
            }, 28);
        }
    }

    function showExplosionRing(latlng: L.LatLng): void {
        const ring = L.circle(latlng, {
            radius: 8, color: '#ff8800', weight: 3,
            fill: true, fillColor: '#ff4400', fillOpacity: 0.6,
        }).addTo(map);
        let radius = 8, opacity = 0.8;
        const ringTimer = setInterval(() => {
            radius  += 6;
            opacity -= 0.12;
            ring.setRadius(radius);
            ring.setStyle({ opacity: Math.max(opacity, 0), fillOpacity: Math.max(opacity - 0.2, 0) });
            if (opacity <= 0) { clearInterval(ringTimer); map.removeLayer(ring); }
        }, 35);
    }

    function showScorePopup(latlng: L.LatLng, pts: string | number): void {
        const popupIcon = L.divIcon({
            className: 'mario-popup-wrap',
            html: `<div class="mario-score-float">+${pts}</div>`,
            iconSize: [40, 20], iconAnchor: [20, 10],
        });
        const popupMarker = L.marker(latlng, { icon: popupIcon }).addTo(map);
        setTimeout(() => map.removeLayer(popupMarker), 2000);
    }

    function fadeRemove(layer: L.Path): void {
        let opacity = 1;
        const fadeTimer = setInterval(() => {
            opacity -= 0.12;
            try { layer.setStyle({ opacity: Math.max(opacity, 0), fillOpacity: Math.max(opacity * 0.3, 0) }); }
            catch { /* layer may already be removed */ }
            if (opacity <= 0) { clearInterval(fadeTimer); map.removeLayer(layer); }
        }, 28);
    }

    function cleanup(): void {
        clearInterval(animTimer);
        clearInterval(moveTimer);
        showToast(`All camps burned! <br> 🏆 Score: ${score} 🏆`, 10000);
        stopBackgroundMusic();
        playSound(AUDIO_END);
        setTimeout(() => {
            map.removeLayer(marioMarker);
            scoreEl.remove();
            marioActive = false;
        }, 10000);
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    const ANIM_TICK_MS      = 60;
    const walkTicksPerFrame = Math.round(1000 / WALK_FPS / ANIM_TICK_MS);

    const animTimer = setInterval(() => {
        if (isPaused) return;
        const inner = getSpriteInner();
        if (!inner) return;

        let cellIndex: number;

        if (isThrowing) {
            cellIndex = CELL_THROW;
        } else if (isTurning) {
            cellIndex = turnCell;
        } else if (isJumping) {
            cellIndex = jumpCells[jumpPhase];
        } else {
            walkTick++;
            if (walkTick >= walkTicksPerFrame) { walkTick = 0; walkPhase = 1 - walkPhase; }
            cellIndex = walkPhase === 0 ? CELL_STEP : CELL_STAND;
        }

        inner.style.backgroundPosition = `${-(cellIndex * Math.round(DISPLAY_W * sizeMultiplier))}px 0`;
        inner.style.transform = facingRight ? 'scaleX(1)' : 'scaleX(-1)';
    }, ANIM_TICK_MS);

    // ── Movement loop ─────────────────────────────────────────────────────────
    const moveTimer = setInterval(() => {
        if (isPaused || isThrowing || isJumping) return;
        if (polygons.length === 0 && mushrooms.length === 0 && stars.length === 0) {
            cleanup();
            return;
        }

        const marioPos = marioMarker.getLatLng();

        if (chasePowerup(marioPos, mushrooms, MOVE_SPEED_M,     () => growMario()))            return;
        if (chasePowerup(marioPos, stars,     MOVE_SPEED_M * 2, () => activateInvincibility())) return;

        const target = resolveLockedTarget(marioPos);
        if (!target) return;

        const dist        = marioPos.distanceTo(target.center);
        const firePos     = getFirePosition(target.center, marioPos);
        const latAligned  = Math.abs(target.center.lat - marioPos.lat) < 0.00005;

        updateFacing(firePos.lng >= marioPos.lng);

        if (latAligned && dist <= FIRE_RANGE_M + 5) {
            facingRight = target.center.lng >= marioPos.lng;
            polygons    = polygons.filter(p => p !== target.poly);
            lockedTarget = null;
            throwFireball(marioPos, target.center, target.poly);
        } else {
            const totalDist = marioPos.distanceTo(firePos);
            const moveStep  = Math.min((MOVE_SPEED_M * (isInvincible ? 2 : 1)) / totalDist, 1);
            marioMarker.setLatLng(L.latLng(
                marioPos.lat + (firePos.lat - marioPos.lat) * moveStep,
                marioPos.lng + (firePos.lng - marioPos.lng) * moveStep,
            ));
        }
    }, Math.round(1000 / MOVE_HZ));
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

function startBackgroundMusic(): void {
    if (bgmAudio) return;
    bgmAudio = new Audio(`./audio/${AUDIO_BGM}`);
    bgmAudio.loop         = true;
    bgmAudio.volume       = BGM_VOLUME;
    bgmAudio.playbackRate = BGM_NORMAL_RATE;
    bgmAudio.play().catch(() => { /* autoplay blocked */ });
}

function setBackgroundMusicPlaybackRate(rate: number): void {
    if (bgmAudio) bgmAudio.playbackRate = rate;
}

function stopBackgroundMusic(): void {
    if (!bgmAudio) return;
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
}

function playSound(name: string): void {
    const audio   = new Audio(`./audio/${name}`);
    audio.volume  = AUDIO_VOLUME;
    audio.play().catch(() => { /* autoplay blocked */ });
}

function collectPolygons(group: L.LayerGroup): L.Polygon[] {
    const out: L.Polygon[] = [];
    group.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
            out.push(layer);
        } else if (layer instanceof L.LayerGroup) {
            out.push(...collectPolygons(layer));
        }
    });
    return out;
}

function showToast(msg: string, durationMs = 2400): void {
    const el = document.createElement('div');
    el.className           = 'mario-toast';
    el.innerHTML           = msg;
    el.style.animationDuration = `${durationMs}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
}

function injectStyles(): void {
    if (document.getElementById('mario-styles')) return;

    const SHEET_W = 7 * DISPLAY_W;
    const styleEl = document.createElement('style');
    styleEl.id    = 'mario-styles';
    styleEl.textContent = `
/* ── Marker ─────────────────────────────────────────────── */
.mario-icon {
    background: none !important;
    border: none !important;
    overflow: visible !important;
}
.mario-sprite-inner {
    width: ${DISPLAY_W}px;
    height: ${DISPLAY_H}px;
    background-image: url('${SPRITE_URL}');
    background-size: ${SHEET_W}px ${DISPLAY_H}px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    transform-origin: center bottom;
    will-change: transform, background-position;
}

/* ── Fireball ────────────────────────────────────────────── */
.mario-fireball-wrap {
    background: none !important;
    border: none !important;
    pointer-events: none !important;
}
.mario-fireball {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #fff 0%, #ffdd00 30%, #ff6600 65%, #cc0000 100%);
    box-shadow: 0 0 8px 4px rgba(255,120,0,0.7), 0 0 16px 6px rgba(255,60,0,0.4);
    image-rendering: pixelated;
    animation: marioFireSpin 0.15s linear infinite;
}
@keyframes marioFireSpin {
    from { transform: scale(1)   rotate(0deg); }
    50%  { transform: scale(1.2) rotate(180deg); }
    to   { transform: scale(1)   rotate(360deg); }
}

/* ── Score HUD ───────────────────────────────────────────── */
#mario-score {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    color: #ff8800;
    background: rgba(0,0,0,0.82);
    padding: 7px 18px;
    border: 2px solid #ff8800;
    border-radius: 4px;
    text-shadow: 2px 2px #330000;
    pointer-events: none;
}
#mario-score.mario-score-pop {
    animation: marioScorePop 0.3s ease-out;
}
@keyframes marioScorePop {
    0%   { transform: translateX(-50%) scale(1.5); }
    100% { transform: translateX(-50%) scale(1); }
}

/* ── Score float ─────────────────────────────────────────── */
.mario-popup-wrap {
    background: none !important;
    border: none !important;
}
.mario-score-float {
    color: #ffdd00;
    font-weight: bold;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    text-shadow: 1px 1px #000, -1px -1px #000;
    white-space: nowrap;
    pointer-events: none;
    animation: marioFloatUp 2s ease-out forwards;
}
@keyframes marioFloatUp {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-36px); }
}

/* ── Particles ───────────────────────────────────────────── */
.mario-particle-wrap {
    background: none !important;
    border: none !important;
    pointer-events: none !important;
}
.mario-pixel {
    width: 6px; height: 6px;
    image-rendering: pixelated;
    box-shadow: 1px 0 rgba(0,0,0,0.4), 0 1px rgba(0,0,0,0.4);
}

/* ── Toast ───────────────────────────────────────────────── */
.mario-toast {
    text-align: center;
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    font-family: 'Courier New', monospace;
    font-size: 22px;
    color: #fff;
    background: rgba(0,0,0,0.88);
    padding: 8px 18px;
    border-radius: 4px;
    pointer-events: none;
    animation: marioToast 2.4s forwards;
}
@keyframes marioToast {
    0%   { opacity: 0; top: 54px; }
    12%  { opacity: 1; top: 64px; }
    70%  { opacity: 1; top: 64px; }
    100% { opacity: 0; top: 74px; }
}

/* ── Mushroom ────────────────────────────────────────────── */
.mario-mushroom-wrap { background: none !important; border: none !important; }
.mario-mushroom {
    font-size: 22px; line-height: 28px; text-align: center;
    animation: mushroomBob 0.6s ease-in-out infinite alternate;
    filter: drop-shadow(0 0 4px rgba(255,150,0,0.8));
}
@keyframes mushroomBob {
    from { transform: translateY(0); }
    to   { transform: translateY(-5px); }
}

/* ── Star ────────────────────────────────────────────────── */
.mario-star-wrap { background: none !important; border: none !important; }
.mario-star {
    font-size: 22px; line-height: 28px; text-align: center;
    animation: starSpin 0.8s linear infinite;
    filter: drop-shadow(0 0 6px rgba(255,220,0,0.9));
}
@keyframes starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.2); }
    to   { transform: rotate(360deg) scale(1); }
}

/* ── Invincibility ───────────────────────────────────────── */
.mario-invincible {
    animation: invincibleFlash 0.3s linear infinite;
}
@keyframes invincibleFlash {
    0%   { filter: hue-rotate(0deg)   brightness(1.8) saturate(3); }
    16%  { filter: hue-rotate(60deg)  brightness(2.2) saturate(3); }
    33%  { filter: hue-rotate(120deg) brightness(1.8) saturate(3); }
    50%  { filter: hue-rotate(180deg) brightness(2.2) saturate(3); }
    66%  { filter: hue-rotate(240deg) brightness(1.8) saturate(3); }
    83%  { filter: hue-rotate(300deg) brightness(2.2) saturate(3); }
    100% { filter: hue-rotate(360deg) brightness(1.8) saturate(3); }
}
    `;
    document.head.appendChild(styleEl);
}