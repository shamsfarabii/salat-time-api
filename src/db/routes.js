import express from 'express';
import {
  deleteJamaatReminder,
  deleteJamaatTime,
  listActiveReminders,
  listJamaatTimes,
  listRemindersByJamaatTime,
  updateJamaatReminder,
  updateJamaatTime,
  upsertJamaatReminder,
  upsertJamaatTime,
} from './index.js';

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * @param {unknown} value
 * @returns {boolean | undefined}
 */
function parseBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return undefined;
}

/**
 * @param {import('express').Router} router
 */
export function registerJamaatRoutes(router) {
  router.get('/jamaat-times', (_request, response) => {
    response.json({
      jamaat_times: listJamaatTimes(),
    });
  });

  router.post('/jamaat-times', (request, response) => {
    const hours = parseInteger(request.body?.hours);
    const minutes = parseInteger(request.body?.minutes);

    if (hours === null || minutes === null) {
      response.status(400).json({ error: 'hours and minutes are required' });
      return;
    }

    try {
      const jamaatTime = upsertJamaatTime({
        prayer: request.body?.prayer,
        hours,
        minutes,
        enabled: parseBoolean(request.body?.enabled),
      });
      response.status(201).json(jamaatTime);
    } catch (error) {
      response.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.put('/jamaat-times/:id', (request, response) => {
    const id = parseInteger(request.params.id);
    if (id === null) {
      response.status(400).json({ error: 'Invalid jamaat time id' });
      return;
    }

    const hours =
      request.body?.hours === undefined ? undefined : parseInteger(request.body.hours);
    const minutes =
      request.body?.minutes === undefined ? undefined : parseInteger(request.body.minutes);

    if (hours === null || minutes === null) {
      response.status(400).json({ error: 'hours and minutes must be integers' });
      return;
    }

    try {
      const jamaatTime = updateJamaatTime(id, {
        hours,
        minutes,
        enabled: parseBoolean(request.body?.enabled),
      });

      if (!jamaatTime) {
        response.status(404).json({ error: 'Jamaat time not found' });
        return;
      }

      response.json(jamaatTime);
    } catch (error) {
      response.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/jamaat-times/:id', (request, response) => {
    const id = parseInteger(request.params.id);
    if (id === null) {
      response.status(400).json({ error: 'Invalid jamaat time id' });
      return;
    }

    const deleted = deleteJamaatTime(id);
    if (!deleted) {
      response.status(404).json({ error: 'Jamaat time not found' });
      return;
    }

    response.sendStatus(204);
  });

  router.get('/jamaat-reminders', (request, response) => {
    const jamaatTimeId = parseInteger(request.query.jamaat_time_id);

    if (jamaatTimeId === null) {
      response.json({ reminders: listActiveReminders() });
      return;
    }

    response.json({
      reminders: listRemindersByJamaatTime(jamaatTimeId),
    });
  });

  router.post('/jamaat-reminders', (request, response) => {
    const jamaatTimeId = parseInteger(request.body?.jamaat_time_id);
    const minutesBefore = parseInteger(request.body?.minutes_before);

    if (jamaatTimeId === null) {
      response.status(400).json({ error: 'jamaat_time_id is required' });
      return;
    }

    if (minutesBefore === null) {
      response.status(400).json({ error: 'minutes_before is required' });
      return;
    }

    try {
      const reminder = upsertJamaatReminder({
        jamaatTimeId,
        minutesBefore,
        audioFile: request.body?.audio_file,
        enabled: parseBoolean(request.body?.enabled),
      });
      response.status(201).json(reminder);
    } catch (error) {
      response.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.put('/jamaat-reminders/:id', (request, response) => {
    const id = parseInteger(request.params.id);
    if (id === null) {
      response.status(400).json({ error: 'Invalid reminder id' });
      return;
    }

    const minutesBefore =
      request.body?.minutes_before === undefined
        ? undefined
        : parseInteger(request.body.minutes_before);

    if (minutesBefore === null) {
      response.status(400).json({ error: 'minutes_before must be an integer' });
      return;
    }

    try {
      const reminder = updateJamaatReminder(id, {
        minutesBefore,
        audioFile: request.body?.audio_file,
        enabled: parseBoolean(request.body?.enabled),
      });

      if (!reminder) {
        response.status(404).json({ error: 'Reminder not found' });
        return;
      }

      response.json(reminder);
    } catch (error) {
      response.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/jamaat-reminders/:id', (request, response) => {
    const id = parseInteger(request.params.id);
    if (id === null) {
      response.status(400).json({ error: 'Invalid reminder id' });
      return;
    }

    const deleted = deleteJamaatReminder(id);
    if (!deleted) {
      response.status(404).json({ error: 'Reminder not found' });
      return;
    }

    response.sendStatus(204);
  });
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
}

/**
 * @param {import('express').Express} app
 */
export function mountJamaatRoutes(app) {
  const router = express.Router();
  registerJamaatRoutes(router);
  app.use(router);
}
