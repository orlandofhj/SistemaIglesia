package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Promocion;
import com.iglesiadelacalle.sistemaiglesia.models.Rol;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PromocionRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.RolRepository;

@RestController
@RequestMapping("/api/personas")
@CrossOrigin(origins = "*")
public class PersonaController {

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PromocionRepository promocionRepository;

    @GetMapping
    public List<Persona> listarTodas() {
        return personaRepository.findAll();
    }

    @PostMapping
    @Transactional // Si falla el rol, no se guarda la persona
    public ResponseEntity<?> crearPersonaConRol(@RequestBody Map<String, Object> payload) {
        try {
            // 1. Validación de datos presentes
            if(!payload.containsKey("cedula") || !payload.containsKey("idRol") || !payload.containsKey("nacionalidad")) {
                return ResponseEntity.badRequest().body("Faltan datos obligatorios (Cédula, Nacionalidad o Rol).");
            }

            Integer cedula = Integer.parseInt(payload.get("cedula").toString());

            // 🛡️ VALIDACIÓN ANTI-DUPLICADOS 🛡️
            if (personaRepository.findByCedula(cedula).isPresent()) {
                return ResponseEntity.badRequest().body("La cédula " + cedula + " ya está registrada.");
            }

            // 2. Guardar la Persona
            Persona nuevaPersona = new Persona();
            nuevaPersona.setNombre(payload.get("nombre").toString());
            nuevaPersona.setApellido(payload.get("apellido").toString());
            nuevaPersona.setNacionalidad(payload.get("nacionalidad").toString());
            nuevaPersona.setCedula(cedula);
            nuevaPersona.setGenero(payload.get("genero").toString());
            
            nuevaPersona = personaRepository.save(nuevaPersona);

            // 3. Asignar el Rol
            Integer idRol = Integer.parseInt(payload.get("idRol").toString());
            Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RuntimeException("El rol " + idRol + " no existe."));

            Promocion promocion = new Promocion();
            promocion.setPersona(nuevaPersona);
            promocion.setRol(rol);
            promocion.setFecha(LocalDate.now());
            promocion.setVigencia(1);
            promocionRepository.save(promocion);

            return ResponseEntity.ok(nuevaPersona);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}