(() => {
  'use strict';
  const DATA = window.N5_VOCAB_DATA;
  if (!DATA?.words?.length) {
    document.body.innerHTML = '<p style="padding:40px;color:white">单词词库加载失败，请刷新页面。</p>';
    return;
  }

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const PROGRESS_KEY = 'n5VocabProgressV1';
  const SESSION_KEY = 'n5VocabSessionsV1';
  const WORD_AUDIO_OVERRIDES = { 'n5-218':'audio/words/0228.mp3' };
  const chapterMap = new Map(DATA.chapters.map(chapter => [chapter.id, chapter]));
  let progress = loadJSON(PROGRESS_KEY, {});
  let selectedChapter = null;
  let selectedUnitIndex = 0;
  let selectedUnits = [];
  let audioPlayer = null;
  let soundEnabled = true;

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function wordProgress(id) {
    return progress[id] || { seen:false, mastery:0, correct:0, wrong:0, nextReview:0, updatedAt:0 };
  }
  function chapterWords(chapterId) {
    return DATA.words.filter(word => word.chapter === chapterId);
  }
  function balancedUnits(words) {
    const unitCount = Math.max(1, Math.ceil(words.length / 10));
    const baseSize = Math.floor(words.length / unitCount);
    const remainder = words.length % unitCount;
    const units = [];
    let offset = 0;
    for (let index = 0; index < unitCount; index += 1) {
      const size = baseSize + (index < remainder ? 1 : 0);
      units.push(words.slice(offset, offset + size));
      offset += size;
    }
    return units;
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  }
  function preferredReading(value) {
    return String(value || '').split(/[／/]/, 1)[0].trim();
  }
  function applyTheme(theme, persist = true) {
    const selected = ['blue', 'pink', 'navy'].includes(theme) ? theme : 'purple';
    document.documentElement.dataset.theme = selected;
    $('#themeColor').content = selected === 'blue' ? '#edf5ff' : selected === 'pink' ? '#16040f' : selected === 'navy' ? '#071632' : '#120922';
    $$('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === selected)));
    if (persist) localStorage.setItem('kanaSprintTheme', selected);
  }

  function renderChapters() {
    $('#chapterGrid').innerHTML = DATA.chapters.map(chapter => {
      const words = chapterWords(chapter.id);
      const units = balancedUnits(words);
      const learned = words.filter(word => wordProgress(word.id).seen).length;
      const mastered = words.filter(word => wordProgress(word.id).mastery >= 5).length;
      const percent = words.length ? Math.round(mastered / words.length * 100) : 0;
      return '<button class="chapter-card chapter-card-button" style="--chapter:' + chapter.color + '" data-open-chapter="' + chapter.id + '" type="button">'
        + '<div class="chapter-top"><span class="chapter-icon">' + escapeHTML(chapter.icon) + '</span><span class="chapter-number">CHAPTER ' + String(chapter.number).padStart(2, '0') + '</span></div>'
        + '<h3>' + escapeHTML(chapter.title) + '</h3><p>' + escapeHTML(chapter.desc) + '</p>'
        + '<div class="chapter-progress"><i style="width:' + percent + '%"></i></div>'
        + '<div class="chapter-foot"><span>' + learned + '/' + words.length + ' 已学习 · ' + mastered + ' 已掌握</span><strong>' + units.length + ' 个单元 →</strong></div>'
        + '</button>';
    }).join('');
  }
  function openChapter(chapterId, unitIndex = 0) {
    const chapter = chapterMap.get(chapterId);
    if (!chapter) return;
    selectedChapter = chapter;
    selectedUnits = balancedUnits(chapterWords(chapterId));
    selectedUnitIndex = Math.max(0, Math.min(selectedUnits.length - 1, unitIndex));
    $('#unitDialogEyebrow').textContent = 'CHAPTER ' + String(chapter.number).padStart(2, '0');
    $('#unitDialogTitle').textContent = chapter.title;
    $('#unitDialogDesc').textContent = chapter.desc;
    $('#unitDialogTitle').style.color = chapter.color;
    $('#unitStart').style.setProperty('--chapter', chapter.color);
    $('#unitSelect').innerHTML = selectedUnits.map((words, index) => {
      return '<option value="' + index + '">单元 ' + (index + 1) + ' · ' + words.length + ' 个词</option>';
    }).join('');
    $('#unitSelect').value = String(selectedUnitIndex);
    $('#unitOverlay').classList.remove('hidden');
    document.body.classList.add('overlay-open');
    renderSelectedUnit();
  }
  function renderSelectedUnit() {
    const words = selectedUnits[selectedUnitIndex] || [];
    $('#unitSelect').value = String(selectedUnitIndex);
    $('#unitWordList').innerHTML = words.map((word, index) => {
      const state = wordProgress(word.id);
      const status = state.mastery >= 5 ? '已掌握' : state.seen ? '已学习' : '新词';
      return '<div class="unit-word"><span class="unit-word-number">' + String(index + 1).padStart(2, '0') + '</span><div><strong>' + escapeHTML(word.word) + '</strong><small>' + escapeHTML(word.reading) + '</small></div><p>' + escapeHTML(word.meaning) + '</p><em>' + status + '</em><button data-preview-speak="' + word.id + '" type="button" aria-label="朗读 ' + escapeHTML(word.word) + '">♪</button></div>';
    }).join('');
  }
  function closeUnits() {
    $('#unitOverlay').classList.add('hidden');
    document.body.classList.remove('overlay-open');
    history.replaceState(null, '', location.pathname);
  }
  function speak(word) {
    if (!word) return;
    if (audioPlayer) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
    window.speechSynthesis?.cancel();
    const audioSource = word.audio || WORD_AUDIO_OVERRIDES[word.id];
    const reading = preferredReading(word.reading);
    if (audioSource) {
      audioPlayer = new Audio(audioSource + '?v=n5-3');
      audioPlayer.play().catch(() => speakWithVoice(reading));
    } else speakWithVoice(reading);
  }
  function speakWithVoice(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(preferredReading(text));
    utterance.lang = 'ja-JP';
    utterance.rate = .82;
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => /^ja[-_]/i.test(voice.lang)) || null;
    speechSynthesis.speak(utterance);
  }
  function renderHistory() {
    const records = loadJSON(SESSION_KEY, []);
    $('#historyTotal').textContent = records.length;
    $('#historyWords').textContent = records.reduce((sum, record) => sum + (Number(record.words) || 0), 0);
    $('#historyBest').textContent = (records.reduce((best, record) => Math.max(best, Number(record.accuracy) || 0), 0)) + '%';
    $('#historyList').innerHTML = records.length ? records.map(record => {
      const date = new Date(record.date).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
      return '<div class="word-history-item"><div><strong>' + escapeHTML(record.mode + ' · ' + record.title) + '</strong><p>' + date + ' · ' + record.words + ' 个词 · 正确 ' + record.correct + ' / 错误 ' + record.wrong + '</p></div><b>' + record.accuracy + '%</b></div>';
    }).join('') : '<div class="history-empty">还没有记录。完成第一次学习后会显示在这里。</div>';
  }
  function setSettingsOpen(open) {
    $('#settingsPopover').classList.toggle('hidden', !open);
    $('#settingsBtn').setAttribute('aria-expanded', String(open));
  }

  $('#chapterGrid').addEventListener('click', event => {
    const card = event.target.closest('[data-open-chapter]');
    if (!card) return;
    openChapter(card.dataset.openChapter, 0);
    history.replaceState(null, '', '?chapter=' + encodeURIComponent(card.dataset.openChapter) + '&unit=0');
  });
  $('#unitSelect').addEventListener('change', event => {
    selectedUnitIndex = Number(event.target.value);
    renderSelectedUnit();
    history.replaceState(null, '', '?chapter=' + encodeURIComponent(selectedChapter.id) + '&unit=' + selectedUnitIndex);
  });
  $('#unitWordList').addEventListener('click', event => {
    const button = event.target.closest('[data-preview-speak]');
    if (!button) return;
    const word = DATA.words.find(item => item.id === button.dataset.previewSpeak);
    speak(word);
  });
  $('#unitStart').onclick = () => {
    location.href = 'vocab.html?chapter=' + encodeURIComponent(selectedChapter.id) + '&unit=' + selectedUnitIndex;
  };
  $$('[data-close-units]').forEach(element => { element.onclick = closeUnits; });

  $('#soundBtn').onclick = () => {
    soundEnabled = !soundEnabled;
    $('#soundBtn').textContent = '音效：' + (soundEnabled ? '开' : '关');
    $('#soundBtn').setAttribute('aria-pressed', String(soundEnabled));
  };
  $('#historyBtn').onclick = () => {
    $('#historyDrawer').classList.remove('hidden');
    renderHistory();
  };
  $$('[data-close-history]').forEach(element => { element.onclick = () => $('#historyDrawer').classList.add('hidden'); });
  $('#clearHistory').onclick = () => {
    if (!confirm('确定清除全部单词模式成绩记录吗？')) return;
    localStorage.removeItem(SESSION_KEY);
    renderHistory();
  };
  $('#settingsBtn').onclick = event => {
    event.stopPropagation();
    setSettingsOpen($('#settingsPopover').classList.contains('hidden'));
  };
  $('#settingsPopover').onclick = event => event.stopPropagation();
  $$('[data-theme-choice]').forEach(button => {
    button.onclick = () => {
      applyTheme(button.dataset.themeChoice);
      setSettingsOpen(false);
    };
  });
  $('#eraseAllData').onclick = () => {
    if (!confirm('确定抹除所有数据吗？成绩、学习进度和全部设置都会被清空，且无法恢复。')) return;
    localStorage.clear();
    location.reload();
  };
  document.addEventListener('click', () => setSettingsOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    setSettingsOpen(false);
    if (!$('#historyDrawer').classList.contains('hidden')) $('#historyDrawer').classList.add('hidden');
    else if (!$('#unitOverlay').classList.contains('hidden')) closeUnits();
  });

  applyTheme(document.documentElement.dataset.theme, false);
  renderChapters();
  const params = new URLSearchParams(location.search);
  if (params.get('chapter')) openChapter(params.get('chapter'), Number.parseInt(params.get('unit'), 10) || 0);
})();
