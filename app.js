(() => {
  const PLAYER_COLORS = [
    '#ff6b6b', '#ffa502', '#2ed573', '#1e90ff',
    '#a55eea', '#ff9ff3', '#2f3542', '#c8d6e5'
  ];
  const DENOMINATIONS = [
    { value: 1, color: '#f1f2f6' },
    { value: 5, color: '#ff6b6b' },
    { value: 10, color: '#2ed573' },
    { value: 50, color: '#2f3542' }
  ];
  const DENOMINATIONS_DESC = DENOMINATIONS.slice().sort((a, b) => b.value - a.value);
  const BASE_STACK_TEMPLATE = { 1: 10, 5: 4, 10: 7, 50: 0 };
  const BASE_STACK_TOTAL = DENOMINATIONS.reduce(
    (sum, denom) => sum + denom.value * (BASE_STACK_TEMPLATE[denom.value] || 0),
    0
  );
  const BANK_STACK_TEMPLATE = { 1: 20, 5: 10, 10: 8, 50: 1 };
  const BANK_STACK_TOTAL = DENOMINATIONS.reduce(
    (sum, denom) => sum + denom.value * (BANK_STACK_TEMPLATE[denom.value] || 0),
    0
  );
  const MIN_PLAYERS = 1;
  const MAX_PLAYERS = 16;
  const BOARD_WIDTH = 960;
  const BOARD_HEIGHT = 1400;
  const AREA_WIDTH = 260;
  const AREA_HEIGHT = 200;
  const POT_SIZE = 300;
  const CHIP_RADIUS = 16;
  const CHIP_STACK_SPACING = CHIP_RADIUS * 1.8;
  const PLAYER_RING_CENTER_Y = 540;
  const PLAYER_RING_RADIUS = 360;
  const PLAYER_AREA_SCALE_MIN = 0.6;
  const PLAYER_AREA_SCALE_MAX = 1.2;
  const PLAYER_AREA_SCALE_BASE_DIVISOR = 6;
  const BANK_CENTER_Y = 1200;
  const PLAYER_AREA_ALPHA = 0.22;
  const BANK_AREA_ALPHA = 0.24;
  const POT_AREA_ALPHA = 0.18;

  const playerCountDisplay = document.getElementById('player-count-display');
  const addPlayerBtn = document.getElementById('add-player-btn');
  const removePlayerBtn = document.getElementById('remove-player-btn');
  const stackTotalInput = document.getElementById('stack-total');
  const stackBreakdown = document.getElementById('stack-breakdown');
  const stackNote = document.getElementById('stack-note');
  const playerConfig = document.getElementById('player-config');
  const legend = document.getElementById('legend');
  const setupBtn = document.getElementById('setup-btn');
  const resetBtn = document.getElementById('reset-btn');
  const overlay = document.getElementById('overlay');
  const scene = document.getElementById('scene');
  const boardEl = document.getElementById('board');

  let currentGame = null;
  let playerCount = 4;

  if (stackNote) {
    stackNote.textContent = '全プレイヤー同一構成 / バンクは細かいチップで200点分を常備';
  }

  if (boardEl) {
    boardEl.style.height = `${BOARD_HEIGHT}px`;
  }

  function sanitizeStackValue(value) {
    const numeric = Number.isFinite(value) ? value : 100;
    const clamped = Math.max(100, numeric);
    return Math.round(clamped / 100) * 100;
  }

  function getStackValue() {
    const raw = Number.parseInt(stackTotalInput.value, 10);
    const sanitized = sanitizeStackValue(raw);
    if (!Number.isFinite(raw) || raw !== sanitized) {
      stackTotalInput.value = sanitized;
    }
    return sanitized;
  }

  function computeStackCounts(stackValue) {
    const total = sanitizeStackValue(stackValue);
    const multiplier = total / BASE_STACK_TOTAL;
    const counts = {};
    DENOMINATIONS.forEach((denom) => {
      const baseCount = BASE_STACK_TEMPLATE[denom.value] || 0;
      counts[denom.value] = baseCount * multiplier;
    });
    return { counts, multiplier, total };
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    let cleaned = hex.replace('#', '').trim();
    if (/[^0-9a-fA-F]/.test(cleaned)) {
      return null;
    }
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map((ch) => ch + ch).join('');
    }
    if (cleaned.length !== 6) {
      return null;
    }
    const value = Number.parseInt(cleaned, 16);
    if (Number.isNaN(value)) {
      return null;
    }
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function colorWithAlpha(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return `rgba(255, 255, 255, ${alpha})`;
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function getReadableTextColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#0b1e2e';
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance < 0.55 ? '#ffffff' : '#0b1e2e';
  }

  function renderLegend() {
    legend.innerHTML = '';
    DENOMINATIONS_DESC.forEach((denom) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-swatch" style="background:${denom.color};"></span>
        <span>${denom.value}点チップ</span>
      `;
      legend.appendChild(item);
    });
  }

  function renderStackBreakdown() {
    const { counts, total } = computeStackCounts(getStackValue());
    const bankCounts = BANK_STACK_TEMPLATE;
    const bankTotal = BANK_STACK_TOTAL;
    stackBreakdown.innerHTML = '';
    DENOMINATIONS_DESC.forEach((denom) => {
      const perPlayer = counts[denom.value] || 0;
      const bank = bankCounts[denom.value] || 0;
      const row = document.createElement('div');
      row.className = 'stack-row';
      row.innerHTML = `
        <span class="stack-swatch" style="background:${denom.color};"></span>
        <span>${denom.value}点チップ</span>
        <span class="stack-count">1人: ${perPlayer.toLocaleString('ja-JP')}枚 / バンク: ${bank.toLocaleString('ja-JP')}枚</span>
      `;
      stackBreakdown.appendChild(row);
    });
    const summaryRow = document.createElement('div');
    summaryRow.className = 'stack-row';
    summaryRow.innerHTML = `
      <span class="stack-swatch" style="visibility:hidden;"></span>
      <span>合計</span>
      <span class="stack-count">1人: ${total.toLocaleString('ja-JP')}点 / バンク: ${bankTotal.toLocaleString('ja-JP')}点</span>
    `;
    stackBreakdown.appendChild(summaryRow);
  }

  function renderPlayerSummary() {
    const stackValue = getStackValue();
    const sets = Math.round(stackValue / BASE_STACK_TOTAL);
    playerConfig.innerHTML = '';
    for (let i = 0; i < playerCount; i += 1) {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.innerHTML = `
        <span class="player-name">プレイヤー${i + 1}</span>
        <span class="player-stack">${stackValue.toLocaleString('ja-JP')}点（${sets}セット）</span>
      `;
      playerConfig.appendChild(card);
    }
  }

  function updatePlayerCountUI() {
    playerCountDisplay.textContent = playerCount;
    removePlayerBtn.disabled = playerCount <= MIN_PLAYERS;
    addPlayerBtn.disabled = playerCount >= MAX_PLAYERS;
  }

  function setPlayerCount(nextCount, { notifyBounds = false, force = false } = {}) {
    const sanitized = Math.max(MIN_PLAYERS, Math.min(nextCount, MAX_PLAYERS));
    if (notifyBounds && sanitized !== nextCount) {
      if (nextCount > MAX_PLAYERS) {
        alert(`プレイヤー人数は最大${MAX_PLAYERS}人までです。`);
      } else if (nextCount < MIN_PLAYERS) {
        alert(`プレイヤー人数は最低${MIN_PLAYERS}人です。`);
      }
    }
    if (!force && sanitized === playerCount) {
      return;
    }
    playerCount = sanitized;
    renderPlayerSummary();
    updatePlayerCountUI();
    overlay.innerHTML = '';
    if (currentGame) {
      cleanupGame();
      resetBtn.disabled = true;
    }
  }

  function cleanupGame() {
    if (!currentGame) return;
    const { render, runner, engine, mouseConstraint, renderLabelHandler } = currentGame;
    Matter.Render.stop(render);
    Matter.Runner.stop(runner);
    if (mouseConstraint) {
      Matter.World.remove(engine.world, mouseConstraint);
    }
    if (renderLabelHandler) {
      Matter.Events.off(render, 'afterRender', renderLabelHandler);
    }
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
    render.canvas.remove();
    currentGame = null;
  }

  function createAreas(playerCount) {
    const areas = [];
    const center = { x: BOARD_WIDTH / 2, y: PLAYER_RING_CENTER_Y };
    const radius = PLAYER_RING_RADIUS;
    const scaleBase = Math.min(PLAYER_AREA_SCALE_MAX, PLAYER_AREA_SCALE_BASE_DIVISOR / Math.max(playerCount, 1));
    const scale = Math.max(PLAYER_AREA_SCALE_MIN, scaleBase);
    const areaWidth = AREA_WIDTH * scale;
    const areaHeight = AREA_HEIGHT * scale;

    for (let i = 0; i < playerCount; i += 1) {
      const angle = (Math.PI * 2 * i) / playerCount - Math.PI / 2;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);

      areas.push({
        id: `player-${i}`,
        type: 'player',
        index: i,
        name: `プレイヤー${i + 1}`,
        x,
        y,
        width: areaWidth,
        height: areaHeight,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        count: 0,
        labelEl: null
      });
    }

    areas.push({
      id: 'pot',
      type: 'pot',
      name: 'センターポット',
      x: center.x,
      y: center.y,
      width: POT_SIZE,
      height: POT_SIZE,
      color: '#f1f2f6',
      labelEl: null
    });

    const bankWidth = AREA_WIDTH * 1.6;
    const bankHeight = AREA_HEIGHT * 1.1;
    areas.push({
      id: 'bank',
      type: 'bank',
      name: 'バンク',
      x: BOARD_WIDTH / 2,
      y: BANK_CENTER_Y,
      width: bankWidth,
      height: bankHeight,
      color: '#ffd32a',
      labelEl: null
    });

    return areas;
  }

  function spawnChips({ world }, areas, playerStackCounts, bankStackCounts) {
    const chips = [];
    const order = DENOMINATIONS_DESC;
    const positionJitter = CHIP_RADIUS * 0.2;

    areas.forEach((area) => {
      let stackCounts = null;
      if (area.type === 'player') {
        stackCounts = playerStackCounts;
      } else if (area.type === 'bank') {
        stackCounts = bankStackCounts;
      } else {
        return;
      }

      const totalChips = order.reduce(
        (sum, denom) => sum + (stackCounts[denom.value] || 0),
        0
      );
      if (!totalChips) return;

      const usableWidth = Math.max(area.width - CHIP_RADIUS * 2, CHIP_RADIUS);
      const usableHeight = Math.max(area.height - CHIP_RADIUS * 2, CHIP_RADIUS);
      const minSpacing = CHIP_RADIUS * 0.9;

      let columns = Math.max(1, Math.ceil(Math.sqrt(totalChips)));
      let rows = Math.max(1, Math.ceil(totalChips / columns));

      const maxColumns = Math.max(1, Math.floor(usableWidth / minSpacing) + 1);
      const maxRows = Math.max(1, Math.floor(usableHeight / minSpacing) + 1);

      if (columns > maxColumns) {
        columns = maxColumns;
        rows = Math.max(1, Math.ceil(totalChips / columns));
      }
      if (rows > maxRows) {
        rows = maxRows;
        columns = Math.max(1, Math.ceil(totalChips / rows));
      }
      if (columns > maxColumns) {
        columns = maxColumns;
        rows = Math.max(1, Math.ceil(totalChips / columns));
      }

      let spacingX = CHIP_STACK_SPACING;
      if (columns > 1) {
        spacingX = Math.min(CHIP_STACK_SPACING, usableWidth / (columns - 1));
      }
      spacingX = Math.max(minSpacing, spacingX);

      let spacingY = CHIP_STACK_SPACING;
      if (rows > 1) {
        spacingY = Math.min(CHIP_STACK_SPACING, usableHeight / (rows - 1));
      }
      spacingY = Math.max(minSpacing, spacingY);

      const totalWidth = spacingX * (columns - 1);
      const totalHeight = spacingY * (rows - 1);
      const startX = area.x - totalWidth / 2;
      const startY = area.y - totalHeight / 2;

      let produced = 0;
      order.forEach((denom) => {
        const target = stackCounts[denom.value] || 0;
        for (let i = 0; i < target; i += 1) {
          const row = Math.floor(produced / columns);
          const col = produced % columns;
          const x = startX + col * spacingX;
          const y = startY + row * spacingY;
          const jitterX = (Math.random() - 0.5) * positionJitter;
          const jitterY = (Math.random() - 0.5) * positionJitter;
          const chipText = denom.value.toString();
          const chipTextSize = denom.value >= 50 ? 11 : 12;
          const textColor = getReadableTextColor(denom.color);
          const chip = Matter.Bodies.circle(x + jitterX, y + jitterY, CHIP_RADIUS, {
            restitution: 0.2,
            friction: 0.95,
            frictionAir: 0.2,
            density: 0.01,
            label: `chip-${denom.value}`,
            render: {
              fillStyle: denom.color,
              strokeStyle: '#ffffff',
              lineWidth: 2,
              text: {
                content: chipText,
                color: textColor,
                size: chipTextSize,
                family: '"Segoe UI", sans-serif',
                weight: '600'
              }
            }
          });
          chip.plugin = { isChip: true, denomination: denom.value, labelColor: textColor };
          chips.push(chip);
          produced += 1;
        }
      });
    });

    if (chips.length > 0) {
      Matter.World.add(world, chips);
    }
    return chips;
  }

  function attachChipLabels(render, chips) {
    const handler = () => {
      const ctx = render.context;
      if (!ctx) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      chips.forEach((chip) => {
        const value = chip.plugin?.denomination;
        if (!value) return;
        const size = value >= 50 ? 13 : value >= 10 ? 14 : 15;
        const textColor = chip.plugin?.labelColor || '#0b1e2e';
        ctx.save();
        ctx.translate(chip.position.x, chip.position.y);
        ctx.rotate(chip.angle);
        ctx.fillStyle = textColor;
        ctx.font = `600 ${size}px "Segoe UI", sans-serif`;
        ctx.fillText(String(value), 0, 1);
        ctx.restore();
      });
      ctx.restore();
    };

    Matter.Events.on(render, 'afterRender', handler);
    return handler;
  }

  function addAreaLabels(areas) {
    overlay.innerHTML = '';
    areas.forEach((area) => {
      const div = document.createElement('div');
      div.className = 'area-label';
      div.style.left = `${area.x}px`;
      div.style.top = `${area.y}px`;
      div.style.borderColor = area.color;
      div.style.boxShadow = `0 0 20px ${area.color}55`;
      let countText = `<span>カウント対象外</span>`;
      if (area.type === 'player' || area.type === 'bank') {
        countText = `<span data-area-count="${area.id}">0点 / 0枚</span>`;
      }
      div.innerHTML = `<strong>${area.name}</strong>${countText}`;
      overlay.appendChild(div);
      area.labelEl = div;
    });
  }

  function formatCount(stats) {
    return `${stats.points}点 / ${stats.chips}枚`;
  }

  function initializeGame(playerCountParam, stackValueParam) {
    cleanupGame();

    const { counts: playerStackCounts, total: stackTotal } = computeStackCounts(stackValueParam);
    const bankStackCounts = { ...BANK_STACK_TEMPLATE };

    const engine = Matter.Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    engine.gravity.scale = 0;
    const render = Matter.Render.create({
      element: scene,
      engine,
      options: {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        wireframes: false,
        background: '#0c3d29',
        pixelRatio: window.devicePixelRatio || 1
      }
    });

    const runner = Matter.Runner.create();
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.3,
        damping: 0.1,
        render: { visible: false }
      }
    });
    render.mouse = mouse;

    const areas = createAreas(playerCountParam);
    addAreaLabels(areas);

    const boundaries = [
      Matter.Bodies.rectangle(BOARD_WIDTH / 2, -20, BOARD_WIDTH, 40, { isStatic: true }),
      Matter.Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 20, BOARD_WIDTH, 40, { isStatic: true }),
      Matter.Bodies.rectangle(-20, BOARD_HEIGHT / 2, 40, BOARD_HEIGHT, { isStatic: true }),
      Matter.Bodies.rectangle(BOARD_WIDTH + 20, BOARD_HEIGHT / 2, 40, BOARD_HEIGHT, { isStatic: true })
    ];

    const sensors = areas.map((area) => {
      let fillStyle = 'rgba(255,255,255,0)';
      let strokeStyle = area.color;
      if (area.type === 'player') {
        fillStyle = colorWithAlpha(area.color, PLAYER_AREA_ALPHA);
      } else if (area.type === 'bank') {
        fillStyle = colorWithAlpha(area.color, BANK_AREA_ALPHA);
      } else if (area.type === 'pot') {
        fillStyle = colorWithAlpha(area.color, POT_AREA_ALPHA);
      }

      const sensor = Matter.Bodies.rectangle(area.x, area.y, area.width, area.height, {
        isStatic: true,
        isSensor: true,
        label: area.id,
        render: {
          fillStyle,
          strokeStyle: strokeStyle || '#ffffff',
          lineWidth: 2
        }
      });
      sensor.plugin = { area };
      return sensor;
    });

    Matter.World.add(engine.world, [...boundaries, ...sensors]);

    const chips = spawnChips(engine, areas, playerStackCounts, bankStackCounts);
    const renderLabelHandler = attachChipLabels(render, chips);
    Matter.World.add(engine.world, mouseConstraint);
    Matter.Events.on(mouseConstraint, 'enddrag', (event) => {
      const body = event.body;
      if (body?.plugin?.isChip) {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      }
    });

    const counts = {};
    areas.forEach((area) => {
      if (area.type === 'player' || area.type === 'bank') {
        counts[area.id] = { chips: 0, points: 0 };
      }
    });
    const membership = new Map();

    function updateAreaCount(area) {
      if (area.type !== 'player' && area.type !== 'bank') return;
      const span = area.labelEl?.querySelector(`[data-area-count="${area.id}"]`);
      if (span) {
        const stats = counts[area.id] || { chips: 0, points: 0 };
        span.textContent = formatCount(stats);
      }
    }

    function recalcCounts() {
      Object.keys(counts).forEach((key) => {
        counts[key].chips = 0;
        counts[key].points = 0;
      });
      membership.clear();
      chips.forEach((chip) => {
        let set = membership.get(chip.id);
        if (!set) {
          set = new Set();
          membership.set(chip.id, set);
        } else {
          set.clear();
        }
        const position = chip.position;
        const chipValue = chip.plugin?.denomination || 0;
        sensors.forEach((sensor) => {
          const area = sensor.plugin.area;
          if (!area || (area.type !== 'player' && area.type !== 'bank')) return;
          if (Math.abs(position.x - area.x) <= area.width / 2 &&
              Math.abs(position.y - area.y) <= area.height / 2) {
            const stats = counts[area.id];
            if (!stats) return;
            stats.chips += 1;
            stats.points += chipValue;
            set.add(sensor.id);
          }
        });
      });
      areas.forEach(updateAreaCount);
    }

    function handlePair(sensorBody, otherBody, isEntering) {
      const sensor = sensorBody.isSensor ? sensorBody : null;
      const chip = otherBody.plugin?.isChip ? otherBody : null;
      if (!sensor || !chip) return;
      const area = sensor.plugin?.area;
      if (!area || (area.type !== 'player' && area.type !== 'bank')) return;

      let set = membership.get(chip.id);
      if (!set) {
        set = new Set();
        membership.set(chip.id, set);
      }
      const stats = counts[area.id];
      if (!stats) return;
      const chipValue = chip.plugin?.denomination || 0;

      if (isEntering) {
        if (!set.has(sensor.id)) {
          set.add(sensor.id);
          stats.chips += 1;
          stats.points += chipValue;
          updateAreaCount(area);
        }
      } else {
        if (set.delete(sensor.id)) {
          stats.chips = Math.max(0, stats.chips - 1);
          stats.points = Math.max(0, stats.points - chipValue);
          updateAreaCount(area);
        }
      }
    }

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if (pair.bodyA.isSensor) {
          handlePair(pair.bodyA, pair.bodyB, true);
        }
        if (pair.bodyB.isSensor) {
          handlePair(pair.bodyB, pair.bodyA, true);
        }
      });
    });

    Matter.Events.on(engine, 'collisionEnd', (event) => {
      event.pairs.forEach((pair) => {
        if (pair.bodyA.isSensor) {
          handlePair(pair.bodyA, pair.bodyB, false);
        }
        if (pair.bodyB.isSensor) {
          handlePair(pair.bodyB, pair.bodyA, false);
        }
      });
    });

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    recalcCounts();

    currentGame = {
      engine,
      render,
      runner,
      mouse,
      mouseConstraint,
      areas,
      sensors,
      chips,
      renderLabelHandler,
      counts,
      membership,
      playerStackCounts,
      bankStackCounts,
      stackValue: stackTotal,
      playerCount: playerCountParam
    };
  }

  function handleSetup() {
    const sanitized = getStackValue();
    initializeGame(playerCount, sanitized);
    resetBtn.disabled = false;
    renderPlayerSummary();
    renderStackBreakdown();
  }

  function handleReset() {
    if (!currentGame) return;
    const { playerCount: savedCount, stackValue: savedStack } = currentGame;
    initializeGame(savedCount, savedStack);
    renderPlayerSummary();
    renderStackBreakdown();
  }

  addPlayerBtn.addEventListener('click', () => {
    setPlayerCount(playerCount + 1, { notifyBounds: true });
  });

  removePlayerBtn.addEventListener('click', () => {
    setPlayerCount(playerCount - 1, { notifyBounds: true });
  });

  stackTotalInput.addEventListener('change', () => {
    const sanitized = getStackValue();
    stackTotalInput.value = sanitized;
    renderStackBreakdown();
    renderPlayerSummary();
    overlay.innerHTML = '';
    if (currentGame) {
      cleanupGame();
      resetBtn.disabled = true;
    }
  });

  setupBtn.addEventListener('click', handleSetup);
  resetBtn.addEventListener('click', handleReset);

  renderLegend();
  renderStackBreakdown();
  setPlayerCount(playerCount, { force: true });
})();
