package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Promocion;
import com.iglesiadelacalle.sistemaiglesia.models.Rol;
import com.iglesiadelacalle.sistemaiglesia.models.Usuario;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PromocionRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.RolRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.UsuarioRepository;
import com.iglesiadelacalle.sistemaiglesia.services.UsuarioService;
import com.iglesiadelacalle.sistemaiglesia.services.EmailVerificationService;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*") 
public class UsuarioController {

    @Autowired private UsuarioService usuarioService;
    @Autowired private UsuarioRepository usuarioRepository; 
    @Autowired private PromocionRepository promocionRepository; 
    @Autowired private PersonaRepository personaRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private EmailVerificationService emailService; 

    // ==========================================
    // ⚡ VALIDACIONES EN TIEMPO REAL ⚡
    // ==========================================
    
    @GetMapping("/check-cedula")
    public ResponseEntity<Boolean> checkCedula(@RequestParam Integer cedula) {
        return ResponseEntity.ok(usuarioRepository.existsByPersona_Cedula(cedula));
    }

    @GetMapping("/check-correo")
    public ResponseEntity<Boolean> checkCorreo(@RequestParam String correo) {
        return ResponseEntity.ok(usuarioRepository.existsByCorreo(correo));
    }

    @GetMapping("/check-usuario")
    public ResponseEntity<Boolean> checkUsuario(@RequestParam String usuario) {
        return ResponseEntity.ok(usuarioRepository.existsByNombreUser(usuario));
    }

    // ==========================================
    // ⚡ SECCIÓN DE VERIFICACIÓN POR CORREO ⚡
    // ==========================================

    @PostMapping("/enviar-codigo-registro")
    public ResponseEntity<?> enviarCodigoRegistro(@RequestBody Map<String, String> payload) {
        String correo = payload.get("correo");
        if (usuarioService.existeCorreo(correo)) return ResponseEntity.badRequest().body("El correo electrónico ya está registrado.");
        try {
            emailService.generarYEnviarCodigo(correo, "Futuro Miembro");
            return ResponseEntity.ok(Map.of("mensaje", "Código enviado con éxito. Revisa tu bandeja de entrada o spam."));
        } catch (Exception e) { return ResponseEntity.status(500).body("Error al enviar el correo: " + e.getMessage()); }
    }

    // ⚡ MÉTODO MEJORADO: VALIDA SI ES EL MISMO CORREO ⚡
    @PostMapping("/enviar-codigo-actualizacion")
    public ResponseEntity<?> enviarCodigoActualizacion(@RequestBody Map<String, String> payload) {
        String correoNuevo = payload.get("correoNuevo");
        String username = payload.get("username");

        try {
            // Buscamos al usuario que está intentando hacer el cambio
            Usuario currentUser = usuarioRepository.findAll().stream()
                .filter(u -> u.getNombreUser().equals(username))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            // 1. Verificamos si escribió exactamente el mismo correo que ya tiene
            if (currentUser.getCorreo().equalsIgnoreCase(correoNuevo)) {
                return ResponseEntity.badRequest().body("Este ya es tu correo electrónico actual. Ingresa uno diferente.");
            }

            // 2. Si es diferente, verificamos que no lo tenga OTRA persona
            if (usuarioService.existeCorreo(correoNuevo)) {
                return ResponseEntity.badRequest().body("Ese correo ya está ocupado por otro usuario en el sistema.");
            }

            // Si pasó todo, enviamos el código
            emailService.generarYEnviarCodigo(correoNuevo, username);
            return ResponseEntity.ok(Map.of("mensaje", "Código de validación enviado al nuevo correo."));
            
        } catch (Exception e) { 
            return ResponseEntity.status(500).body("Error: " + e.getMessage()); 
        }
    }

    // ==========================================
    // ⚡ PROCESOS FINALES ⚡
    // ==========================================

    @PostMapping("/registro-web-verificado")
    public ResponseEntity<?> registroWebVerificado(@RequestBody Map<String, String> datos) {
        String correo = datos.get("correo");
        String codigo = datos.get("codigo");
        if (!emailService.verificarCodigo(correo, codigo)) return ResponseEntity.status(401).body("El código de verificación es incorrecto o ya expiró.");
        try {
            Integer cedula = Integer.parseInt(datos.get("cedula"));
            String usuario = datos.get("usuario");
            String password = datos.get("password");
            Usuario nuevoUser = usuarioService.registrarUsuarioCompleto(cedula, correo, usuario, password);
            return ResponseEntity.ok(nuevoUser);
        } catch (Exception e) { return ResponseEntity.badRequest().body("Error al registrar: " + e.getMessage()); }
    }

    @PutMapping("/actualizar-correo-verificado")
    public ResponseEntity<?> actualizarCorreoVerificado(@RequestBody Map<String, String> payload) {
        String oldUsername = payload.get("oldUsername");
        String newCorreo = payload.get("newCorreo");
        String codigo = payload.get("codigo");
        if (!emailService.verificarCodigo(newCorreo, codigo)) return ResponseEntity.status(401).body("Código de validación inválido.");
        try {
            Usuario user = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(oldUsername)).findFirst().orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            user.setCorreo(newCorreo);
            user.setCorreoVerificado("S");
            usuarioRepository.save(user);
            return ResponseEntity.ok("Correo actualizado correctamente.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ==========================================
    // ⚡ SESIÓN Y PERFIL WEB ⚡
    // ==========================================

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        try {
            String username = credenciales.get("usuario");
            String password = credenciales.get("password");
            
            Optional<Usuario> userOpt = usuarioRepository.findAll().stream()
                .filter(u -> u.getNombreUser().equals(username))
                .findFirst();
                
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(404).body("El usuario '" + username + "' no existe.");
            }
            
            Usuario user = userOpt.get();
            if (!user.getPasswork().equals(password)) {
                return ResponseEntity.status(401).body("La contraseña es incorrecta.");
            }
            
            // ⚡ YA NO BLOQUEAMOS EL ACCESO AQUÍ. Dejamos que entre, el Frontend se encarga de limitarlo.
            
            Promocion promo = promocionRepository.findTopByPersonaOrderByFechaDesc(user.getPersona())
                .orElseThrow(() -> new RuntimeException("El usuario no tiene un rol asignado"));
                
            return ResponseEntity.ok(Map.of(
                "nombre", user.getPersona().getNombre() + " " + user.getPersona().getApellido(),
                "rol", promo.getRol().getIdRol(), 
                "username", user.getNombreUser(),
                "foto", user.getFotoPerfil() != null ? user.getFotoPerfil() : "",
                "estado", user.getEstado() != null ? user.getEstado() : "Activo" // ⚡ Mandamos el estado al Front
            ));
        } catch (Exception e) { 
            return ResponseEntity.status(400).body("Error: " + e.getMessage()); 
        }
    }

    @GetMapping("/perfil/{username}")
    public ResponseEntity<?> obtenerPerfil(@PathVariable String username) {
        try {
            Usuario user = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(username)).findFirst().orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            return ResponseEntity.ok(Map.of(
                "username", user.getNombreUser(), "correo", user.getCorreo(),
                "foto", user.getFotoPerfil() != null ? user.getFotoPerfil() : "",
                "correoVerificado", user.getCorreoVerificado() != null ? user.getCorreoVerificado() : "N" 
            ));
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/actualizar-datos")
    public ResponseEntity<?> actualizarDatos(@RequestBody Map<String, String> payload) {
        try {
            Usuario user = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(payload.get("oldUsername"))).findFirst().orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (payload.get("newUsername") != null && !payload.get("newUsername").isEmpty()) user.setNombreUser(payload.get("newUsername"));
            usuarioRepository.save(user);
            return ResponseEntity.ok("Nombre de usuario actualizado.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/actualizar-password")
    public ResponseEntity<?> actualizarPassword(@RequestBody Map<String, String> payload) {
        try {
            Usuario user = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(payload.get("username"))).findFirst().orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            user.setPasswork(payload.get("newPassword"));
            usuarioRepository.save(user);
            return ResponseEntity.ok("Contraseña actualizada.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/upload-avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file, @RequestParam("username") String username) {
        try {
            Usuario user = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(username)).findFirst().orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            String uploadDir = "uploads/fotos/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            String fileName = username + "_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll(" ", "_");
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);
            String fileUrl = "/" + uploadDir + fileName;
            user.setFotoPerfil(fileUrl);
            usuarioRepository.save(user);
            return ResponseEntity.ok(Map.of("mensaje", "Foto actualizada", "url", fileUrl));
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

// ================================================================
    // ⚡ PANEL DE ADMINISTRACIÓN: CENTRADO EN 'PERSONA' ⚡
    // ================================================================

    // --- FUNCIONES AUXILIARES DE SEGURIDAD ---
    private Integer obtenerRolUsuarioLogueado(String username) {
        if (username == null || username.isEmpty()) return 0;
        Optional<Usuario> userOpt = usuarioRepository.findAll().stream().filter(u -> u.getNombreUser().equals(username)).findFirst();
        if (userOpt.isPresent()) {
            Optional<Promocion> promo = promocionRepository.findTopByPersonaOrderByFechaDesc(userOpt.get().getPersona());
            if (promo.isPresent() && promo.get().getRol() != null) return promo.get().getRol().getIdRol();
        }
        return 0;
    }

    private Integer obtenerRolObjetivo(Persona persona) {
        Optional<Promocion> promo = promocionRepository.findTopByPersonaOrderByFechaDesc(persona);
        if (promo.isPresent() && promo.get().getRol() != null) return promo.get().getRol().getIdRol();
        return 1; 
    }
    // -----------------------------------------

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodosLosUsuarios(@RequestParam(required = false) String currentUser) {
        try {
            List<Map<String, Object>> listaUsuarios = new ArrayList<>();
            for (Persona p : personaRepository.findAll()) {
                
                Optional<Usuario> userOpt = usuarioRepository.findAll().stream()
                    .filter(u -> u.getPersona() != null && u.getPersona().getIdPersona().equals(p.getIdPersona()))
                    .findFirst();

                if (userOpt.isPresent() && currentUser != null && userOpt.get().getNombreUser().equals(currentUser)) {
                    continue; 
                }

                Map<String, Object> map = new HashMap<>();
                map.put("idPersona", p.getIdPersona()); 
                map.put("nombre", p.getNombre());
                map.put("apellido", p.getApellido());
                map.put("nacionalidad", p.getNacionalidad());
                map.put("cedula", p.getCedula());
                
                // ⚡ AQUÍ ESTÁ LA CORRECCIÓN: Garantiza enviar el género exacto y previene errores de campos nulos
                map.put("genero", p.getGenero() != null && !p.getGenero().trim().isEmpty() ? p.getGenero() : "M");

                String rolNombre = "Congregante";
                Optional<Promocion> promo = promocionRepository.findTopByPersonaOrderByFechaDesc(p);
                if (promo.isPresent() && promo.get().getRol() != null) {
                    int rolId = promo.get().getRol().getIdRol();
                    if (rolId == 1) rolNombre = "Congregante";
                    else if (rolId == 2) rolNombre = "Líder";
                    else if (rolId == 3) rolNombre = "Pastor";
                }
                map.put("rol", rolNombre);

                if (userOpt.isPresent()) {
                    map.put("estado", userOpt.get().getEstado() != null ? userOpt.get().getEstado() : "Activo");
                    map.put("foto", userOpt.get().getFotoPerfil());
                } else {
                    map.put("estado", "Sin Registro"); 
                    map.put("foto", null);
                }
                
                listaUsuarios.add(map);
            }
            return ResponseEntity.ok(listaUsuarios);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/admin/crear")
    public ResponseEntity<?> crearUsuarioAdmin(@RequestBody Map<String, String> payload) {
        try {
            String solicitante = payload.get("solicitante");
            String nombreRol = payload.get("rol");

            // 🛡️ VALIDACIÓN DE PRIVILEGIOS BACKEND
            Integer rolSolicitante = obtenerRolUsuarioLogueado(solicitante);
            if (rolSolicitante == 2 && (nombreRol.equals("Pastor") || nombreRol.equals("Líder"))) {
                return ResponseEntity.status(403).body("Seguridad: Un Líder no puede crear a un Pastor ni a otro Líder.");
            }
            if (rolSolicitante < 2) return ResponseEntity.status(403).body("No tienes permisos de administrador.");

            // ⚡ Aplicamos el formateo
            String nombreStr = formatearNombre(payload.get("nombre"));
            String apellidoStr = formatearNombre(payload.get("apellido"));
            String cedulaStr = payload.get("cedula");
            String nacionalidad = payload.get("nacionalidad");
            String genero = payload.get("genero");

            if (nombreStr == null || !nombreStr.matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) return ResponseEntity.badRequest().body("Nombre inválido.");
            if (apellidoStr == null || !apellidoStr.matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) return ResponseEntity.badRequest().body("Apellido inválido.");
            if (cedulaStr == null || !cedulaStr.matches("^\\d{7,8}$")) return ResponseEntity.badRequest().body("Cédula inválida.");

            Integer cedula = Integer.parseInt(cedulaStr);
            if (personaRepository.findByCedula(cedula).isPresent()) return ResponseEntity.badRequest().body("Esta cédula ya está registrada en la iglesia.");

            Persona nuevaPersona = new Persona();
            nuevaPersona.setNombre(nombreStr);
            nuevaPersona.setApellido(apellidoStr);
            nuevaPersona.setCedula(cedula);
            nuevaPersona.setNacionalidad(nacionalidad);
            nuevaPersona.setGenero(genero);
            personaRepository.save(nuevaPersona);

            Integer idRolNuevo = nombreRol.equals("Pastor") ? 3 : (nombreRol.equals("Líder") ? 2 : 1);
            Rol rol = rolRepository.findById(idRolNuevo).orElseThrow(() -> new RuntimeException("Rol inexistente."));
            Promocion promo = new Promocion();
            promo.setPersona(nuevaPersona);
            promo.setRol(rol);
            promo.setFecha(java.time.LocalDate.now());
            promo.setVigencia(1);
            promocionRepository.save(promo);

            return ResponseEntity.ok("Persona registrada. Pendiente de registro web.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/admin/modificar/{idPersona}")
    public ResponseEntity<?> modificarUsuarioAdmin(@PathVariable Integer idPersona, @RequestBody Map<String, String> payload) {
        try {
            Persona persona = personaRepository.findById(idPersona).orElseThrow(() -> new RuntimeException("Persona no encontrada"));
            
            String solicitante = payload.get("solicitante");
            String nombreRol = payload.get("rol");

            // 🛡️ VALIDACIÓN DE PRIVILEGIOS BACKEND
            Integer rolSolicitante = obtenerRolUsuarioLogueado(solicitante);
            Integer rolObjetivo = obtenerRolObjetivo(persona); 
            
            if (rolSolicitante == 2) {
                if (rolObjetivo == 2 || rolObjetivo == 3) {
                    return ResponseEntity.status(403).body("Seguridad: No puedes editar a un Pastor o a otro Líder.");
                }
                if (nombreRol.equals("Pastor") || nombreRol.equals("Líder")) {
                    return ResponseEntity.status(403).body("Seguridad: Un Líder no puede promover a alguien a Pastor o Líder.");
                }
            }
            if (rolSolicitante < 2) return ResponseEntity.status(403).body("No tienes permisos para modificar.");

            // ⚡ Aplicamos el formateo
            String nombreStr = formatearNombre(payload.get("nombre"));
            String apellidoStr = formatearNombre(payload.get("apellido"));
            String cedulaStr = payload.get("cedula");

            if (nombreStr == null || !nombreStr.matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) return ResponseEntity.badRequest().body("Nombre inválido.");
            if (apellidoStr == null || !apellidoStr.matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) return ResponseEntity.badRequest().body("Apellido inválido.");
            if (cedulaStr == null || !cedulaStr.matches("^\\d{7,8}$")) return ResponseEntity.badRequest().body("Cédula inválida.");

            Integer nuevaCedula = Integer.parseInt(cedulaStr);
            Optional<Persona> otraPersona = personaRepository.findByCedula(nuevaCedula);
            if (otraPersona.isPresent() && !otraPersona.get().getIdPersona().equals(idPersona)) {
                return ResponseEntity.badRequest().body("La cédula pertenece a otra persona.");
            }
            
            persona.setNombre(nombreStr);
            persona.setApellido(apellidoStr);
            persona.setNacionalidad(payload.get("nacionalidad")); 
            persona.setCedula(nuevaCedula);
            persona.setGenero(payload.get("genero"));
            personaRepository.save(persona);

            Integer idRolNuevo = nombreRol.equals("Pastor") ? 3 : (nombreRol.equals("Líder") ? 2 : 1);
            Promocion promoActual = promocionRepository.findTopByPersonaOrderByFechaDesc(persona).orElse(null);
            if (promoActual != null) {
                Rol nuevoRol = rolRepository.findById(idRolNuevo).orElseThrow(() -> new RuntimeException("Rol inexistente."));
                promoActual.setRol(nuevoRol);
                promocionRepository.save(promoActual);
            }
            return ResponseEntity.ok("Persona modificada exitosamente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/{idPersona}/cambiar-estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer idPersona, @RequestBody Map<String, String> payload) {
        try {
            Persona persona = personaRepository.findById(idPersona).orElseThrow(() -> new RuntimeException("Persona no encontrada"));
            String solicitante = payload.get("solicitante");

            // 🛡️ VALIDACIÓN DE PRIVILEGIOS BACKEND
            Integer rolSolicitante = obtenerRolUsuarioLogueado(solicitante);
            Integer rolObjetivo = obtenerRolObjetivo(persona);
            
            if (rolSolicitante == 2 && (rolObjetivo == 2 || rolObjetivo == 3)) {
                return ResponseEntity.status(403).body("Seguridad: No puedes bloquear a un Pastor o a otro Líder.");
            }
            if (rolSolicitante < 2) return ResponseEntity.status(403).body("No tienes permisos para esta acción.");

            Usuario user = usuarioRepository.findAll().stream()
                .filter(u -> u.getPersona() != null && u.getPersona().getIdPersona().equals(idPersona))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Esta persona aún no ha creado su cuenta web."));
            
            String nuevoEstado = payload.get("estado");
            user.setEstado(nuevoEstado);
            usuarioRepository.save(user);
            return ResponseEntity.ok("Estado actualizado a " + nuevoEstado);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ================================================================
    // ⚡ SISTEMA DE RECUPERACIÓN DE CREDENCIALES (FORGOT PASSWORD) ⚡
    // ================================================================

    @PostMapping("/recuperar/iniciar")
    public ResponseEntity<?> iniciarRecuperacion(@RequestBody Map<String, Integer> payload) {
        try {
            Integer cedula = payload.get("cedula");
            
            // Buscamos si la persona tiene un usuario web
            Usuario user = usuarioRepository.findAll().stream()
                .filter(u -> u.getPersona() != null && u.getPersona().getCedula().equals(cedula))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No existe ninguna cuenta registrada con esta cédula."));
                
            if (user.getCorreo() == null || user.getCorreo().isEmpty()) {
                return ResponseEntity.badRequest().body("La cuenta no tiene un correo electrónico configurado.");
            }

            // Enviamos el código al correo
            emailService.generarYEnviarCodigo(user.getCorreo(), user.getPersona().getNombre());
            
            // Censuramos el correo para el Frontend (orla******@gmail.com)
            String correo = user.getCorreo();
            String[] parts = correo.split("@");
            String name = parts[0];
            String domain = parts[1];
            
            if (name.length() > 4) {
                name = name.substring(0, 4) + "******";
            } else {
                name = name.substring(0, 1) + "******";
            }
            String maskedEmail = name + "@" + domain;
            
            return ResponseEntity.ok(Map.of("maskedEmail", maskedEmail));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/recuperar/finalizar")
    public ResponseEntity<?> finalizarRecuperacion(@RequestBody Map<String, String> payload) {
        try {
            Integer cedula = Integer.parseInt(payload.get("cedula").toString());
            String codigo = payload.get("codigo");
            String tipo = payload.get("tipo"); 
            String nuevoValor = payload.get("nuevoValor");

            Usuario user = usuarioRepository.findAll().stream()
                .filter(u -> u.getPersona() != null && u.getPersona().getCedula().equals(cedula))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado."));

            if (!emailService.verificarCodigo(user.getCorreo(), codigo)) {
                return ResponseEntity.status(401).body("El código de verificación es incorrecto o ha expirado.");
            }

            if ("usuario".equals(tipo)) {
                if (usuarioRepository.existsByNombreUser(nuevoValor)) {
                    return ResponseEntity.badRequest().body("El nombre de usuario ya está ocupado por otra persona.");
                }
                user.setNombreUser(nuevoValor);
            } else if ("password".equals(tipo)) {
                user.setPasswork(nuevoValor);
            } else {
                return ResponseEntity.badRequest().body("Tipo de recuperación inválido.");
            }

            usuarioRepository.save(user);

            // 🛡️ SEGURIDAD ESTRICTA: No retornamos datos de sesión, solo confirmación.
            return ResponseEntity.ok("Credenciales actualizadas correctamente. Por seguridad, debe iniciar sesión manualmente.");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ⚡ MÉTODO AUXILIAR PARA FORMATEAR NOMBRES (Ej: Juan Perez)
    private String formatearNombre(String texto) {
        if (texto == null || texto.trim().isEmpty()) return texto;
        String[] palabras = texto.trim().toLowerCase().split("\\s+");
        StringBuilder resultado = new StringBuilder();
        for (String palabra : palabras) {
            if (!palabra.isEmpty()) {
                resultado.append(Character.toUpperCase(palabra.charAt(0)))
                         .append(palabra.substring(1)).append(" ");
            }
        }
        return resultado.toString().trim();
    }
}