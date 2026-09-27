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
  const BOOK_HIDDEN_KEY = 'n5VocabBookHiddenV1';
  const DAY = 86400000;
  const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];
  const GENERATED_WORD_AUDIO = new Set(['n5-218','n5-070','n5-172','n5-538','n5-357','n5-304','n5-379','n5-396','n5-189','n5-048','n5-608','n5-612','n5-365','n5-559','n5-058','n5-077','n5-112','n5-146','n5-096','n5-501','n5-303','n5-135','n5-597','n5-152','n5-057','n5-074','n5-553','n5-389','n5-107','n5-367','n5-623','n5-174','n5-237','n5-064','n5-354','n5-462','n5-656','n5-012','n5-621','n5-007','n5-023','n5-047','n5-050','n5-052','n5-053','n5-072','n5-076','n5-078','n5-082','n5-106','n5-108','n5-133','n5-136','n5-141','n5-145','n5-148','n5-165','n5-176','n5-558','n5-085']);
  const chapterMap = new Map(DATA.chapters.map(chapter => [chapter.id, chapter]));
  const wordMap = new Map(DATA.words.map(word => [word.id, word]));
  let progress = loadJSON(PROGRESS_KEY, {});
  let hiddenBookWords = new Set(loadJSON(BOOK_HIDDEN_KEY, []));
  let currentSession = null;
  let currentWord = null;
  let audioPlayer = null;
  let feedbackTimer = 0;
  let autoSpeakTimer = 0;
  let lastSessionStarter = null;
  let libraryMode = 'all';
  let soundEnabled = true;
  let kanaScript = 'hira';
  let kanaAudioPlayer = null;
  const KANA = [
    ['あ','ア','a'],['い','イ','i'],['う','ウ','u'],['え','エ','e'],['お','オ','o'],['か','カ','ka'],['き','キ','ki'],['く','ク','ku'],['け','ケ','ke'],['こ','コ','ko'],
    ['さ','サ','sa'],['し','シ','shi'],['す','ス','su'],['せ','セ','se'],['そ','ソ','so'],['た','タ','ta'],['ち','チ','chi'],['つ','ツ','tsu'],['て','テ','te'],['と','ト','to'],
    ['な','ナ','na'],['に','ニ','ni'],['ぬ','ヌ','nu'],['ね','ネ','ne'],['の','ノ','no'],['は','ハ','ha'],['ひ','ヒ','hi'],['ふ','フ','fu'],['へ','ヘ','he'],['ほ','ホ','ho'],
    ['ま','マ','ma'],['み','ミ','mi'],['む','ム','mu'],['め','メ','me'],['も','モ','mo'],['や','ヤ','ya'],['ゆ','ユ','yu'],['よ','ヨ','yo'],['ら','ラ','ra'],['り','リ','ri'],
    ['る','ル','ru'],['れ','レ','re'],['ろ','ロ','ro'],['わ','ワ','wa'],['を','ヲ','wo'],['ん','ン','n'],['が','ガ','ga'],['ぎ','ギ','gi'],['ぐ','グ','gu'],['げ','ゲ','ge'],
    ['ご','ゴ','go'],['ざ','ザ','za'],['じ','ジ','ji'],['ず','ズ','zu'],['ぜ','ゼ','ze'],['ぞ','ゾ','zo'],['だ','ダ','da'],['で','デ','de'],['ど','ド','do'],
    ['ば','バ','ba'],['び','ビ','bi'],['ぶ','ブ','bu'],['べ','ベ','be'],['ぼ','ボ','bo'],['ぱ','パ','pa'],['ぴ','ピ','pi'],['ぷ','プ','pu'],['ぺ','ペ','pe'],['ぽ','ポ','po'],
    ['きゃ','キャ','kya'],['きゅ','キュ','kyu'],['きょ','キョ','kyo'],['しゃ','シャ','sha'],['しゅ','シュ','shu'],['しょ','ショ','sho'],['ちゃ','チャ','cha'],['ちゅ','チュ','chu'],['ちょ','チョ','cho'],
    ['にゃ','ニャ','nya'],['にゅ','ニュ','nyu'],['にょ','ニョ','nyo'],['ひゃ','ヒャ','hya'],['ひゅ','ヒュ','hyu'],['ひょ','ヒョ','hyo'],['みゃ','ミャ','mya'],['みゅ','ミュ','myu'],['みょ','ミョ','myo'],
    ['りゃ','リャ','rya'],['りゅ','リュ','ryu'],['りょ','リョ','ryo'],['ぎゃ','ギャ','gya'],['ぎゅ','ギュ','gyu'],['ぎょ','ギョ','gyo'],['じゃ','ジャ','ja'],['じゅ','ジュ','ju'],['じょ','ジョ','jo']
  ];
  const KANA_SECTIONS = [
    { title:'清音', rows:[KANA.slice(0,5),KANA.slice(5,10),KANA.slice(10,15),KANA.slice(15,20),KANA.slice(20,25),KANA.slice(25,30),KANA.slice(30,35),KANA.slice(35,38),KANA.slice(38,43),KANA.slice(43,46)] },
    { title:'浊音・半浊音', rows:[KANA.slice(46,51),KANA.slice(51,56),KANA.slice(56,59),KANA.slice(59,64),KANA.slice(64,69)] },
    { title:'拗音', rows:[KANA.slice(69,72),KANA.slice(72,75),KANA.slice(75,78),KANA.slice(78,81),KANA.slice(81,84),KANA.slice(84,87),KANA.slice(87,90),KANA.slice(90,93),KANA.slice(93,96)] }
  ];

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
  function saveBookHidden() {
    localStorage.setItem(BOOK_HIDDEN_KEY, JSON.stringify([...hiddenBookWords]));
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
  function shuffled(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
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
  function renderKanaChart() {
    const glyphIndex = kanaScript === 'hira' ? 0 : 1;
    $('#kanaChart').innerHTML = KANA_SECTIONS.map(section => '<section class="chart-section"><h3>' + section.title + '</h3>' + section.rows.map(row => '<div class="kana-grid">' + row.map(item => {
      const kana = item[glyphIndex];
      return '<button class="kana-tile" type="button" data-kana="' + kana + '" data-romaji="' + item[2] + '" aria-label="朗读 ' + kana + '，罗马音 ' + item[2] + '"><span class="speak-mark">♪</span><span class="kana-glyph">' + kana + '</span><span class="kana-romaji">' + item[2] + '</span></button>';
    }).join('') + '</div>').join('') + '</section>').join('');
  }
  function stopKanaAudio() {
    if (!kanaAudioPlayer) return;
    kanaAudioPlayer.pause();
    kanaAudioPlayer.currentTime = 0;
    kanaAudioPlayer = null;
  }
  function speakKana(kana, romaji) {
    stopKanaAudio();
    const status = $('#kanaSpeakStatus');
    const audio = new Audio('audio/' + encodeURIComponent(romaji) + '.mp3?v=20260923i2');
    kanaAudioPlayer = audio;
    status.textContent = '正在朗读：' + kana + ' · ' + romaji;
    audio.onended = () => { if (kanaAudioPlayer === audio) { status.textContent = '已朗读：' + kana + ' · ' + romaji; kanaAudioPlayer = null; } };
    audio.onerror = () => { if (kanaAudioPlayer === audio) { status.textContent = '音频加载失败，请刷新页面后重试。'; kanaAudioPlayer = null; } };
    audio.play().catch(() => { if (kanaAudioPlayer === audio) { status.textContent = '播放未开始，请再点击一次。'; kanaAudioPlayer = null; } });
  }
  function openKanaDrawer() {
    $('#kanaDrawer').classList.remove('hidden');
    renderKanaChart();
  }
  function closeKanaDrawer() {
    $('#kanaDrawer').classList.add('hidden');
    stopKanaAudio();
  }
  function weakestSort(a, b) {
    const left = wordProgress(a.id), right = wordProgress(b.id);
    const leftRate = left.wrong / Math.max(1, left.correct + left.wrong);
    const rightRate = right.wrong / Math.max(1, right.correct + right.wrong);
    return right.wrong - left.wrong || rightRate - leftRate || left.mastery - right.mastery;
  }
  function bookWords() {
    return DATA.words.filter(word => wordProgress(word.id).wrong > 0 && !hiddenBookWords.has(word.id)).sort(weakestSort);
  }

  function dashboardStats() {
    const states = DATA.words.map(word => wordProgress(word.id));
    const learned = states.filter(state => state.seen).length;
    const mastered = states.filter(state => state.mastery >= 5).length;
    const now = Date.now();
    const due = DATA.words.filter(word => {
      const state = wordProgress(word.id);
      return state.seen && state.nextReview <= now;
    });
    return { learned, mastered, due, book:bookWords() };
  }
  function renderDashboard() {
    const stats = dashboardStats();
    const masteredPercent = Math.round(stats.mastered / DATA.total * 100);
    $('#learnedCount').textContent = stats.learned;
    $('#masteredCount').textContent = stats.mastered;
    $('#totalCount').textContent = DATA.total;
    $('#masteredPercent').textContent = masteredPercent + '%';
    $('#progressOrbit').style.setProperty('--progress', masteredPercent);
    $('#dueBadge').textContent = stats.due.length;
    $('#bookBadge').textContent = stats.book.length;
    $('#todayHint').textContent = stats.due.length
      ? '今天有 ' + stats.due.length + ' 个单词需要复习。'
      : stats.learned ? '今天的到期复习已经完成。' : '选择一个主题，开始第一个学习单元。';
  }

  function startDueReview() {
    const now = Date.now();
    const due = DATA.words.filter(word => {
      const state = wordProgress(word.id);
      return state.seen && state.nextReview <= now;
    }).sort(weakestSort).slice(0, 20);
    if (!due.length) { alert('目前没有到期单词。完成学习单元后，系统会自动安排复习。'); return; }
    lastSessionStarter = startDueReview;
    beginSession(due, '复习模式', '到期复习');
  }
  function startBookReview() {
    const words = bookWords().slice(0, 20);
    if (!words.length) { alert('单词本目前是空的。答错的词会自动收录到这里。'); return; }
    closeLibrary();
    lastSessionStarter = startBookReview;
    beginSession(words, '单词本复习', '错词巩固');
  }
  function startUnitFromURL() {
    const params = new URLSearchParams(location.search);
    const chapter = chapterMap.get(params.get('chapter'));
    if (!chapter || !params.has('unit')) return false;
    const units = balancedUnits(chapterWords(chapter.id));
    const unitIndex = Math.max(0, Math.min(units.length - 1, Number.parseInt(params.get('unit'), 10) || 0));
    const words = units[unitIndex];
    const returnURL = 'vocab-chapters.html?chapter=' + encodeURIComponent(chapter.id) + '&unit=' + unitIndex;
    const starter = () => beginSession(words, chapter.title + ' · 单元 ' + (unitIndex + 1), '单元学习', returnURL);
    lastSessionStarter = starter;
    starter();
    return true;
  }

  function beginSession(words, title, mode, returnURL = '') {
    if (!words.length) return;
    clearTimeout(feedbackTimer);
    clearTimeout(autoSpeakTimer);
    document.body.classList.add('session-active');
    currentSession = {
      words,
      title,
      mode,
      returnURL,
      previews:words.filter(word => !wordProgress(word.id).seen),
      previewIndex:0,
      questions:[],
      questionIndex:0,
      correct:0,
      wrong:0,
      results:Object.fromEntries(words.map(word => [word.id, { correct:0, wrong:0 }]))
    };
    $('#dashboardView').classList.add('hidden');
    $('#sessionView').classList.remove('hidden');
    $('#resultOverlay').classList.add('hidden');
    $('#sessionChapter').textContent = title;
    $('#sessionMode').textContent = mode;
    window.scrollTo(0, 0);
    if (currentSession.previews.length) renderPreview();
    else beginQuestions();
  }
  function setSessionProgress(current, total) {
    $('#sessionCurrent').textContent = Math.min(total, current);
    $('#sessionTotal').textContent = total;
    $('#sessionProgress').style.width = (total ? Math.min(100, current / total * 100) : 0) + '%';
  }
  function resetCard() {
    clearTimeout(feedbackTimer);
    clearTimeout(autoSpeakTimer);
    const card = $('#studyCard');
    card.className = 'study-card';
    $('#choiceGrid').classList.add('hidden');
    $('#choiceGrid').innerHTML = '';
    $('#answerFeedback').textContent = '';
    $('#answerFeedback').className = 'answer-feedback';
    $('#nextCard').classList.remove('hidden');
    $('#exampleBlock').classList.remove('hidden');
    $('#wordReading').classList.remove('hidden');
    $('#wordRomaji').classList.remove('hidden');
    $('#wordMeaning').classList.remove('hidden');
    $('#wordMain').removeAttribute('role');
    $('#wordMain').removeAttribute('tabindex');
    $('#wordMain').removeAttribute('aria-label');
  }
  function fillWordDetails(word) {
    currentWord = word;
    $('#wordMain').textContent = word.word;
    $('#wordReading').textContent = word.reading;
    $('#wordRomaji').textContent = word.romaji;
    $('#wordMeaning').textContent = word.meaning;
    $('#exampleText').textContent = word.example;
    $('#exampleMeaning').textContent = word.exampleMeaning || '';
    $('#exampleMeaning').classList.toggle('hidden', !word.exampleMeaning);
    $('#exampleBlock').classList.toggle('hidden', !(word.example && word.exampleMeaning));
  }
  function renderPreview() {
    resetCard();
    const index = currentSession.previewIndex;
    const word = currentSession.previews[index];
    fillWordDetails(word);
    $('#questionLabel').textContent = '新词预习 · 自动朗读';
    $('#nextCard').innerHTML = index === currentSession.previews.length - 1 ? '开始练习 <span>→</span>' : '下一个 <span>→</span>';
    setSessionProgress(index + 1, currentSession.previews.length);
    autoSpeakTimer = setTimeout(() => speak(word), 220);
  }
  function beginQuestions() {
    const questions = [];
    currentSession.words.forEach(word => {
      questions.push({ type:'meaning', word });
      questions.push({ type:'reverse', word });
      questions.push({ type:'listening', word });
    });
    currentSession.questions = shuffled(questions);
    currentSession.questionIndex = 0;
    renderQuestion();
  }
  function choiceOptions(question) {
    const getLabel = word => question.type === 'reverse' ? word.word : word.meaning;
    const correctLabel = getLabel(question.word);
    const seenLabels = new Set([correctLabel.trim()]);
    const preferred = DATA.words.filter(word => word.id !== question.word.id && word.chapter === question.word.chapter);
    const fallback = DATA.words.filter(word => word.id !== question.word.id && word.chapter !== question.word.chapter);
    const distractors = [];
    for (const word of [...shuffled(preferred), ...shuffled(fallback)]) {
      const label = getLabel(word).trim();
      if (!label || seenLabels.has(label)) continue;
      seenLabels.add(label);
      distractors.push(word);
      if (distractors.length === 3) break;
    }
    return shuffled([
      { key:question.word.id, label:correctLabel, correct:true },
      ...distractors.map(word => ({ key:word.id, label:getLabel(word), correct:false }))
    ]);
  }
  function renderQuestion() {
    resetCard();
    const question = currentSession.questions[currentSession.questionIndex];
    if (!question) { finishSession(); return; }
    const card = $('#studyCard');
    card.classList.add('question', question.type + '-question');
    fillWordDetails(question.word);
    $('#nextCard').classList.add('hidden');
    setSessionProgress(currentSession.questionIndex + 1, currentSession.questions.length);
    if (question.type === 'meaning') {
      $('#questionLabel').textContent = '选择正确的中文意思';
    } else if (question.type === 'reverse') {
      $('#questionLabel').textContent = '根据中文选择日语单词';
      $('#wordMain').textContent = question.word.meaning;
    } else {
      $('#questionLabel').textContent = '听读音选择中文意思';
      $('#wordMain').textContent = '♪';
      $('#wordMain').setAttribute('role', 'button');
      $('#wordMain').setAttribute('tabindex', '0');
      $('#wordMain').setAttribute('aria-label', '重新播放读音');
      autoSpeakTimer = setTimeout(() => speak(question.word), 180);
    }
    const grid = $('#choiceGrid');
    grid.classList.remove('hidden');
    grid.innerHTML = choiceOptions(question).map(option => '<button type="button" data-choice="' + option.key + '" data-correct="' + option.correct + '">' + escapeHTML(option.label) + '</button>').join('');
  }
  function judgeChoice(button) {
    if (button.disabled) return;
    const question = currentSession.questions[currentSession.questionIndex];
    const correct = button.dataset.correct === 'true';
    $$('#choiceGrid button').forEach(choice => {
      choice.disabled = true;
      if (choice.dataset.correct === 'true') choice.classList.add('correct');
    });
    if (!correct) button.classList.add('wrong');
    judgeAnswer(correct, question);
  }
  function judgeAnswer(correct, question) {
    const word = question.word;
    const result = currentSession.results[word.id];
    if (question.type === 'listening') {
      $('#studyCard').classList.add('revealed');
      $('#wordMain').removeAttribute('role');
      $('#wordMain').removeAttribute('tabindex');
      fillWordDetails(word);
    }
    if (correct) {
      currentSession.correct += 1;
      result.correct += 1;
      $('#answerFeedback').textContent = question.type === 'listening' ? '正确！' + word.word + ' · ' + word.reading + ' · ' + word.meaning : '正确！';
      $('#answerFeedback').className = 'answer-feedback good';
      playTone(true);
    } else {
      currentSession.wrong += 1;
      result.wrong += 1;
      hiddenBookWords.delete(word.id);
      saveBookHidden();
      $('#answerFeedback').textContent = '正确答案：' + word.word + ' · ' + word.reading + ' · ' + word.meaning;
      $('#answerFeedback').className = 'answer-feedback bad';
      playTone(false);
      speak(word);
    }
    const delay = question.type === 'listening' ? 1900 : correct ? 1050 : 2100;
    feedbackTimer = setTimeout(() => {
      currentSession.questionIndex += 1;
      renderQuestion();
    }, delay);
  }

  function finishSession() {
    const now = Date.now();
    let improved = 0;
    currentSession.words.forEach(word => {
      const previous = wordProgress(word.id);
      const result = currentSession.results[word.id];
      const required = currentSession.questions.filter(question => question.word.id === word.id).length;
      const successful = result.wrong === 0 && result.correct >= required;
      const mastery = successful ? Math.min(5, previous.mastery + 1) : Math.max(0, previous.mastery - (result.wrong ? 1 : 0));
      if (mastery > previous.mastery) improved += 1;
      progress[word.id] = {
        seen:true,
        mastery,
        correct:previous.correct + result.correct,
        wrong:previous.wrong + result.wrong,
        nextReview:now + REVIEW_INTERVALS[mastery] * DAY,
        updatedAt:now
      };
    });
    saveProgress();
    const total = currentSession.correct + currentSession.wrong;
    const record = { id:now, date:new Date(now).toISOString(), mode:currentSession.mode, title:currentSession.title, words:currentSession.words.length, correct:currentSession.correct, wrong:currentSession.wrong, accuracy:total ? Math.round(currentSession.correct / total * 100) : 0 };
    const records = loadJSON(SESSION_KEY, []);
    records.unshift(record);
    localStorage.setItem(SESSION_KEY, JSON.stringify(records.slice(0, 100)));
    $('#resultTitle').textContent = currentSession.mode === '单元学习' ? '本单元学习完成' : '本次复习完成';
    $('#resultSummary').textContent = '完成 ' + currentSession.words.length + ' 个单词，共回答 ' + total + ' 题';
    $('#resultCorrect').textContent = currentSession.correct;
    $('#resultAccuracy').textContent = record.accuracy + '%';
    $('#resultImproved').textContent = improved;
    $('#resultOverlay').classList.remove('hidden');
    renderDashboard();
  }
  function leaveSession(confirmLeave = true) {
    if (confirmLeave && currentSession?.questions?.length && currentSession.questionIndex < currentSession.questions.length && !confirm('当前练习还没完成，确定返回吗？本次进度不会保存。')) return;
    clearTimeout(feedbackTimer);
    clearTimeout(autoSpeakTimer);
    const returnURL = currentSession?.returnURL;
    currentSession = null;
    currentWord = null;
    document.body.classList.remove('session-active');
    if (returnURL) { location.href = returnURL; return; }
    $('#sessionView').classList.add('hidden');
    $('#resultOverlay').classList.add('hidden');
    $('#dashboardView').classList.remove('hidden');
    renderDashboard();
    window.scrollTo(0, 0);
  }

  function speak(word) {
    if (!word) return;
    if (audioPlayer) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
    window.speechSynthesis?.cancel();
    const audioSource = GENERATED_WORD_AUDIO.has(word.id) ? 'audio/words-generated/' + word.id + '.mp3' : word.audio;
    const reading = preferredReading(word.reading);
    if (audioSource) {
      audioPlayer = new Audio(audioSource + '?v=n5-5');
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
  function playTone(success) {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = success ? 'sine' : 'triangle';
      oscillator.frequency.value = success ? 720 : 210;
      gain.gain.setValueAtTime(.045, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .12);
      oscillator.onended = () => context.close();
    } catch {}
  }

  function openLibrary(mode = 'all') {
    libraryMode = mode;
    $('#libraryTitle').textContent = mode === 'book' ? '单词本' : '全部词库';
    $('#libraryEyebrow').textContent = mode === 'book' ? 'WRONG WORDS' : 'VOCABULARY';
    $('#libraryPractice').classList.toggle('hidden', mode !== 'book' || !bookWords().length);
    $('#libraryDrawer').classList.remove('hidden');
    renderLibrary();
    setTimeout(() => $('#librarySearch').focus(), 50);
  }
  function closeLibrary() {
    $('#libraryDrawer').classList.add('hidden');
  }
  function renderLibrary() {
    const query = $('#librarySearch').value.trim().toLowerCase();
    const chapter = $('#libraryChapter').value;
    const source = libraryMode === 'book' ? bookWords() : DATA.words;
    const matches = source.filter(word => {
      const inChapter = chapter === 'all' || word.chapter === chapter;
      const haystack = (word.word + ' ' + word.reading + ' ' + word.romaji + ' ' + word.meaning).toLowerCase();
      return inChapter && (!query || haystack.includes(query));
    });
    $('#libraryCount').textContent = libraryMode === 'book'
      ? '单词本中有 ' + source.length + ' 个词，当前显示 ' + matches.length + ' 个'
      : '显示 ' + matches.length + ' / ' + DATA.total + ' 个词';
    $('#libraryList').innerHTML = matches.map(word => {
      const chapterInfo = chapterMap.get(word.chapter);
      const state = wordProgress(word.id);
      const status = libraryMode === 'book' ? '答错 ' + state.wrong + ' 次' : state.mastery >= 5 ? '已掌握' : state.seen ? '熟练度 ' + state.mastery + '/5' : '未学习';
      const remove = libraryMode === 'book' ? '<button class="library-remove" data-remove-book="' + word.id + '" type="button">移除</button>' : '';
      return '<div class="library-item ' + (libraryMode === 'book' ? 'book-item' : '') + '" style="--chapter:' + chapterInfo.color + '"><div class="library-word"><strong>' + escapeHTML(word.word) + '</strong><span>' + escapeHTML(word.reading) + ' · ' + escapeHTML(word.romaji) + ' · ' + status + '</span></div><div class="library-meaning">' + escapeHTML(word.meaning) + '</div><div class="library-item-actions"><button class="library-speak" data-speak-word="' + word.id + '" type="button" aria-label="朗读">♪</button>' + remove + '</div></div>';
    }).join('') || '<p class="library-empty">' + (libraryMode === 'book' ? '单词本目前是空的。答错的词会自动出现在这里。' : '没有找到匹配的单词。') + '</p>';
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

  $('#reviewBtn').onclick = startDueReview;
  $('#wordbookBtn').onclick = () => openLibrary('book');
  $('#sessionBack').onclick = () => leaveSession(true);
  $('#nextCard').onclick = () => {
    if (!currentSession) return;
    currentSession.previewIndex += 1;
    if (currentSession.previewIndex < currentSession.previews.length) renderPreview();
    else beginQuestions();
  };
  $('#speakBtn').onclick = () => speak(currentWord);
  $('#wordMain').addEventListener('click', () => {
    if ($('#studyCard').classList.contains('listening-question') && !$('#studyCard').classList.contains('revealed')) speak(currentWord);
  });
  $('#wordMain').addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && $('#studyCard').classList.contains('listening-question')) {
      event.preventDefault();
      speak(currentWord);
    }
  });
  $('#choiceGrid').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) judgeChoice(button);
  });
  $('#resultHome').onclick = () => leaveSession(false);
  $('#resultAgain').onclick = () => {
    $('#resultOverlay').classList.add('hidden');
    if (lastSessionStarter) lastSessionStarter();
  };

  $('#libraryBtn').onclick = () => openLibrary('all');
  $('#kanaTableBtn').onclick = openKanaDrawer;
  $$('[data-close-kana]').forEach(element => { element.onclick = closeKanaDrawer; });
  $$('[data-chart-script]').forEach(button => {
    button.onclick = () => {
      kanaScript = button.dataset.chartScript;
      $$('[data-chart-script]').forEach(item => item.classList.toggle('active', item === button));
      renderKanaChart();
    };
  });
  $('#kanaChart').addEventListener('click', event => {
    const tile = event.target.closest('[data-kana]');
    if (tile) speakKana(tile.dataset.kana, tile.dataset.romaji);
  });
  $('#libraryPractice').onclick = startBookReview;
  $$('[data-close-library]').forEach(element => { element.onclick = closeLibrary; });
  $('#librarySearch').addEventListener('input', renderLibrary);
  $('#libraryChapter').addEventListener('change', renderLibrary);
  $('#libraryList').addEventListener('click', event => {
    const speakButton = event.target.closest('[data-speak-word]');
    if (speakButton) { speak(wordMap.get(speakButton.dataset.speakWord)); return; }
    const removeButton = event.target.closest('[data-remove-book]');
    if (!removeButton) return;
    hiddenBookWords.add(removeButton.dataset.removeBook);
    saveBookHidden();
    renderLibrary();
    renderDashboard();
  });

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
    else if (!$('#kanaDrawer').classList.contains('hidden')) closeKanaDrawer();
    else if (!$('#libraryDrawer').classList.contains('hidden')) closeLibrary();
    else if (!$('#sessionView').classList.contains('hidden')) leaveSession(true);
  });

  $('#libraryChapter').innerHTML += DATA.chapters.map(chapter => '<option value="' + chapter.id + '">' + chapter.number + '. ' + escapeHTML(chapter.title) + '</option>').join('');
  applyTheme(document.documentElement.dataset.theme, false);
  renderDashboard();
  startUnitFromURL();
})();
