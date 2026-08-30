# Статус первого среза

## Реализовано

- Тёмный одностраничный интерфейс: карточки участников + порядок инициативы + нижний журнал.
- 54 физически уникальные карты (52 + 2 Joker), общий draw pile и discard pile.
- Сдать инициативу всем активным участникам.
- Старые карты инициативы уходят в общий сброс перед новым раундом.
- Joker помечает текущий раунд; перед следующей раздачей сброс автоматически замешивается обратно.
- Быстрый: карты 5 и ниже пересдаются до 6+ или Joker.
- Медлительный: две карты, худшая; Joker имеет приоритет.
- Холодные Нервы: 2 карты и ручной выбор.
- Улучшенные Холодные Нервы: 3 карты и ручной выбор.
- Быстрый работает вместе с Холодными Нервами; Медлительный блокирует несовместимые настройки.
- Сдать карту конкретному участнику и сразу отправить её в сброс.
- ДК / статисты, массовое добавление ×2 / ×3 / ×5; Enter быстро добавляет статиста, а окно добавления остаётся открытым.
- В шоке, Уязвим, Отвлечён, произвольные пользовательские состояния.
- Ранения, Усталость, возможность включить ранения статисту.
- «Выбыл» доступно прямо на активной карточке; удаление становится доступно только после выбытия. Выбывшая карточка приглушается и участник перестаёт получать инициативу.
- В общей сетке Дикие Карты всегда отображаются первыми; список инициативы при этом не меняется.
- Быстрое меню состояний `+` прямо на карточке, включая пользовательское состояние.
- Трекинг текущего хода: первый участник активируется после раздачи, «Следующий ход» двигает выделение, после последнего участника раунд помечается завершённым.
- История вытянутых карт у участника и общий журнал событий.
- localStorage + JSON экспорт/импорт.

## Проверки в этом окружении

Игровой движок прошёл отдельный исполняемый smoke-test на:

- сохранение ровно 54 физических карт без дубликатов/потерь;
- Quick;
- Hesitant;
- Level Headed и последующий выбор;
- Joker и перемешивание перед следующим раундом;
- переход активного участника по инициативе и завершение раунда;
- корректный переход хода, если активный участник выбыл.

TypeScript-код приложения также был проверен локальным `tsc` с временными заглушками React-типов.

Полный `npm install / npm run build` здесь запустить нельзя: окружение не резолвит `registry.npmjs.org`. На обычной машине первый запуск должен начинаться с `npm install`.

## v4 UI ordering update
- Removed participant-count density modes; participant cards use the original comfortable size again.
- Table presentation order is now: active participant first (if any), then remaining Wild Cards, then remaining Extras.
- Initiative list ordering is unchanged and still follows card initiative only.

## v5 defeated participant safety/update
- Table order: active combatant first, then remaining active Wild Cards, then active Extras, then all defeated participants at the end.
- Defeated cards get a dedicated top action strip with `Вернуть` and `Удалить`.
- Active cards no longer expose `Удалить`; they must be marked `Выбыл` first.
- Settings modal also only exposes deletion for defeated participants.
- Game engine rejects deletion of a non-defeated participant as an additional safety guard.

## v6 spectator multiplayer

- Firebase Web App config встроен в клиент.
- Firebase SDK загружается модульно с официального gstatic CDN, поэтому новая npm-зависимость не требуется.
- Ведущий может создать room с коротким кодом и скопировать spectator link.
- Realtime Database URL задаётся runtime один раз и включается в room link.
- Firebase Anonymous Auth используется для стабильного owner UID ведущего и spectator UID игроков.
- Владелец комнаты восстанавливает удалённый snapshot после F5, если anonymous UID браузера сохранился.
- Spectator получает GameState отдельным remote snapshot: его собственный localStorage не перезаписывается просмотром чужой комнаты.
- Spectator UI read-only: нет раздачи, изменения состояний, счётчиков, удаления, настроек или выбора Level Headed.
- Активный участник, инициатива, карточки и журнал продолжают обновляться в реальном времени.
- При потере соединения ведущий продолжает играть локально; spectator видит последнее полученное состояние и индикатор связи.
- Security Rules вынесены в `firebase-database.rules.json`: root closed, room read for authenticated clients, write only by room owner.
