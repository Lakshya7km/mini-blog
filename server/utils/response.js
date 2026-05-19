exports.success = (res, data = {}, message = 'OK', status = 200) =>
    res.status(status).json({ success: true, data, message });

exports.error = (res, message = 'Server error', code = 'ERROR', status = 500) =>
    res.status(status).json({ success: false, message, code });
